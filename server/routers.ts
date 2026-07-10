import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, authRateLimitedProcedure } from "./_core/trpc";
import { z } from "zod";
import { createEvent, getNearbyEvents, joinEvent, createSponsorshipRequest, reportLostDog, reportSighting, getNearbyLostDogs, getSightings, createReview, getReviewsForUser, getAverageRating, createVerification, getVerificationForUser, updateVerificationStatus } from "./db";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { calculateCompatibility, getAffinities } from "@shared/compatibilityEngine";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
import { logger } from "./_core/logger";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,
  storage: router({
    uploadPhoto: protectedProcedure
      .input(
        z.object({
          base64Data: z.string(),
          filename: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const match = input.base64Data.match(/^data:([^;]+);base64,(.+)$/);
        let mimeType = "application/octet-stream";
        let base64Payload = input.base64Data;
        
        if (match) {
          mimeType = match[1];
          base64Payload = match[2];
        }

        const buffer = Buffer.from(base64Payload, "base64");
        
        let extension = "jpg";
        if (mimeType === "image/png") extension = "png";
        else if (mimeType === "image/webp") extension = "webp";
        else if (mimeType === "image/gif") extension = "gif";
        
        const fileId = crypto.randomUUID();
        const baseFilename = input.filename ? path.basename(input.filename, path.extname(input.filename)) : `photo_${fileId}`;
        const finalFilename = `${baseFilename}_${fileId.slice(0, 8)}.${extension}`;
        
        if (ENV.forgeApiUrl && ENV.forgeApiKey) {
          try {
            const { key } = await storagePut(`uploads/${finalFilename}`, buffer, mimeType);
            return { url: `/manus-storage/${key}` };
          } catch (error) {
            console.error("[Storage] Forge upload failed, falling back to local storage:", error);
          }
        }
        
        const uploadsDir = path.resolve(import.meta.dirname, "..", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, finalFilename);
        fs.writeFileSync(filePath, buffer);
        
        return { url: `/uploads/${finalFilename}` };
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const email = ctx.user?.email || "unknown";
      logger.auth("logout", email, true, `UserId: ${ctx.user?.id}`);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Email + Password Authentication
    signup: authRateLimitedProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string().min(2),
        })
      )
      .mutation(async ({ input, ctx }) => {
        logger.auth("signup_attempt", input.email, false);
        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          logger.auth("signup_failed", input.email, false, "Email already registered");
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        // Create user
        const user = await db.createUserWithPassword({
          email: input.email,
          hashedPassword,
          name: input.name,
        });

        if (!user) {
          logger.auth("signup_failed", input.email, false, "Failed to create user in database");
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        }

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId || "", { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        logger.auth("signup_success", input.email, true, `UserId: ${user.id}`);
        triggerN8nWebhook("user.registered", {
          id: user.id,
          name: user.name,
          email: user.email,
        });
        return { success: true, user };
      }),

    login: authRateLimitedProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        logger.auth("login_attempt", input.email, false);
        // Find user by email
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.hashedPassword) {
          logger.auth("login_failed", input.email, false, "Invalid email or password");
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(input.password, user.hashedPassword);
        if (!isValidPassword) {
          logger.auth("login_failed", input.email, false, "Invalid password");
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId || "", { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        logger.auth("login_success", input.email, true, `UserId: ${user.id}`);
        return { success: true, user };
      }),
  }),

  // User Profile Management
  user: router({
    // Get current user profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const userProfile = await db.getUserById(ctx.user.id);
      if (!userProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return userProfile;
    }),

    // Update user profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          age: z.number().int().min(1).max(150).optional(),
          interests: z.array(z.string()).optional(),
          walkingHabits: z.string().optional(),
          whatISeek: z.array(z.enum(["friend", "mentor", "intergenerational"])).optional(),
          bio: z.string().max(500).optional(),
          profilePhotoUrl: z.string().optional(),
          phoneNumber: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updateData: any = {};
        if (input.age !== undefined) updateData.age = input.age;
        if (input.interests !== undefined) updateData.interests = JSON.stringify(input.interests);
        if (input.walkingHabits !== undefined) updateData.walkingHabits = input.walkingHabits;
        if (input.whatISeek !== undefined) updateData.whatISeek = JSON.stringify(input.whatISeek);
        if (input.bio !== undefined) updateData.bio = input.bio;
        if (input.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = input.profilePhotoUrl;
        if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber;

        await db.updateUserProfile(ctx.user.id, updateData);

        // Fetch updated user to trigger webhook
        const updatedUser = await db.getUserById(ctx.user.id);
        triggerN8nWebhook("profile.updated", {
          userId: ctx.user.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          phoneNumber: updatedUser?.phoneNumber,
          age: updatedUser?.age,
          bio: updatedUser?.bio
        });

        return { success: true };
      }),

    // Update user location
    updateLocation: protectedProcedure
      .input(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserLocation(ctx.user.id, input.latitude, input.longitude);
        return { success: true };
      }),

    setHomeLocation: protectedProcedure
      .input(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.setHomeLocation(ctx.user.id, input.latitude, input.longitude);
        return { success: true };
      }),

    toggleLocationSharing: protectedProcedure
      .input(z.object({ isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleLocationSharing(ctx.user.id, input.isActive);
        return { success: true };
      }),

    getPublicProfile: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getPublicUserProfile(ctx.user.id, input.targetUserId);
      }),
  }),

  // Dog Profile Management
  dog: router({
    // Get all dogs for current user
    getMyDogs: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDogsByUserId(ctx.user.id);
    }),

    // Get a specific dog
    getDog: protectedProcedure
      .input(z.object({ dogId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dog = await db.getDogById(input.dogId);
        if (!dog || dog.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Dog not found" });
        }
        return dog;
      }),

    // Create a new dog profile
    createDog: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          breed: z.string().max(100).optional(),
          age: z.number().int().min(0).max(50).optional(),
          description: z.string().max(500).optional(),
          personality: z.array(z.string()).optional(),
          photoUrls: z.array(z.string()).max(3).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.createDog({
          userId: ctx.user.id,
          name: input.name,
          breed: input.breed,
          age: input.age,
          description: input.description,
          personality: input.personality ? (JSON.stringify(input.personality) as any) : undefined,
          photoUrls: input.photoUrls ? (JSON.stringify(input.photoUrls) as any) : undefined,
        });
        const user = await db.getUserById(ctx.user.id);
        triggerN8nWebhook("dog.created", {
          userId: ctx.user.id,
          userName: user?.name,
          dogName: input.name,
          breed: input.breed,
        });
        return { success: true };
      }),

    // Update dog profile
    updateDog: protectedProcedure
      .input(
        z.object({
          dogId: z.number(),
          name: z.string().min(1).max(100).optional(),
          breed: z.string().max(100).optional(),
          age: z.number().int().min(0).max(50).optional(),
          description: z.string().max(500).optional(),
          personality: z.array(z.string()).optional(),
          photoUrls: z.array(z.string()).max(3).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const dog = await db.getDogById(input.dogId);
        if (!dog || dog.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Dog not found" });
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.breed !== undefined) updateData.breed = input.breed;
        if (input.age !== undefined) updateData.age = input.age;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.personality !== undefined) updateData.personality = JSON.stringify(input.personality) as any;
        if (input.photoUrls !== undefined) updateData.photoUrls = JSON.stringify(input.photoUrls) as any;

        await db.updateDog(input.dogId, updateData);

        return { success: true };
      }),

    // Delete dog profile
    deleteDog: protectedProcedure
      .input(z.object({ dogId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dog = await db.getDogById(input.dogId);
        if (!dog || dog.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Dog not found" });
        }

        // TODO: Implement delete logic
        return { success: true };
      }),
  }),

  // Discovery & Swipe
  discovery: router({
    // Get nearby duos
    getNearbyDuos: protectedProcedure
      .input(
        z.object({
          radiusKm: z.number().min(0.5).max(50).default(5),
        })
      )
      .query(async ({ ctx, input }) => {
        let duos: any[] = await db.getNearbyDuos(ctx.user.id, input.radiusKm);
        
        // Premium Fallback to Mock Data when database is offline or empty
        if (duos.length === 0) {
          duos = [
            {
              user: {
                id: 101,
                name: "Alice Martin",
                age: 28,
                bio: "Passionnée par la randonnée et le grand air. J'adore me promener le matin avec mon chien et rencontrer de nouvelles personnes !",
                interests: ["hiking", "nature", "outdoor", "parks"],
                walkingHabits: "morning",
                whatISeek: ["friend"],
                profilePhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
              },
              dogs: [
                {
                  id: 201,
                  name: "Buddy",
                  breed: "Golden Retriever",
                  age: 3,
                  description: "Extrêmement joueur et amical. Adore rapporter la balle et nager !",
                  personality: ["playful", "social", "friendly"],
                  photoUrls: ["https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600"],
                }
              ]
            },
            {
              user: {
                id: 102,
                name: "Bob Mercier",
                age: 32,
                bio: "Sportif et adepte des parcs de agility. Rocky adore courir et courir après sa balle. Toujours partant pour une balade active !",
                interests: ["sports", "fitness", "outdoor", "parks"],
                walkingHabits: "evening",
                whatISeek: ["friend", "mentor"],
                profilePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
              },
              dogs: [
                {
                  id: 202,
                  name: "Rocky",
                  breed: "German Shepherd",
                  age: 4,
                  description: "Très protecteur et obéissant. Aime faire du jogging et jouer au frisbee.",
                  personality: ["protective", "loyal", "energetic"],
                  photoUrls: ["https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&q=80&w=600"],
                }
              ]
            },
            {
              user: {
                id: 103,
                name: "Charlie Dubois",
                age: 24,
                bio: "Étudiante en photographie. Luna est ma muse poilue. On se balade souvent dans les parcs calmes pour faire des photos.",
                interests: ["parks", "nature", "relaxation", "reading"],
                walkingHabits: "daily",
                whatISeek: ["friend"],
                profilePhotoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400",
              },
              dogs: [
                {
                  id: 203,
                  name: "Luna",
                  breed: "Border Collie",
                  age: 2,
                  description: "Très intelligente et attentive. Adore apprendre des tours et courir dans les champs.",
                  personality: ["energetic", "loyal", "gentle"],
                  photoUrls: ["https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&q=80&w=600"],
                }
              ]
            },
            {
              user: {
                id: 104,
                name: "David Laurent",
                age: 45,
                bio: "Habitué des cafés dog-friendly. Daisy est un petit rayon de soleil. On cherche des maîtres pour s'entraider lors des balades en centre-ville.",
                interests: ["cafes", "social", "relaxation", "community"],
                walkingHabits: "frequent",
                whatISeek: ["friend"],
                profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
              },
              dogs: [
                {
                  id: 204,
                  name: "Daisy",
                  breed: "Chihuahua",
                  age: 1,
                  description: "Un peu timide au début mais très câline. Adore être blottie dans les bras.",
                  personality: ["shy", "calm", "friendly"],
                  photoUrls: ["https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&q=80&w=600"],
                }
              ]
            },
            {
              user: {
                id: 105,
                name: "Emma Roche",
                age: 29,
                bio: "Nouvelle dans la région. Coco adore jouer avec tous les chiens de sa taille. On cherche à faire partie de la communauté de balades !",
                interests: ["social", "cafes", "community", "events"],
                walkingHabits: "weekend",
                whatISeek: ["friend"],
                profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
              },
              dogs: [
                {
                  id: 205,
                  name: "Coco",
                  breed: "Pug",
                  age: 5,
                  description: "Adore les siestes et manger des friandises. Très rigolo et affectueux.",
                  personality: ["lazy", "calm", "friendly"],
                  photoUrls: ["https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=600"],
                }
              ]
            }
          ];
        }

        // Get swiped and blocked user IDs to filter them out of discovery list
        const swipedUserIds = await db.getSwipedUserIds(ctx.user.id);
        const blockedUserIds = await db.getBlockedUserIds(ctx.user.id);
        const excludeUserIds = [...swipedUserIds, ...blockedUserIds];
        const filteredDuos = duos.filter(d => !excludeUserIds.includes(Number(d.user.id)));

        // Helper parsers for JSON arrays in mysql
        const parseJsonField = (field: any): string[] => {
          if (!field) return [];
          if (Array.isArray(field)) return field;
          if (typeof field === "string") {
            try {
              return JSON.parse(field);
            } catch {
              return [field];
            }
          }
          return [];
        };

        const buildDogProfile = (dog: any) => {
          if (!dog) return {};
          return {
            breed: dog.breed,
            age: dog.age,
            personality: parseJsonField(dog.personality),
          };
        };

        const buildMasterProfile = (usr: any) => {
          if (!usr) return {};
          return {
            age: usr.age,
            interests: parseJsonField(usr.interests),
            walkingHabits: usr.walkingHabits ? [usr.walkingHabits] : [],
            whatISeek: parseJsonField(usr.whatISeek),
          };
        };

        // Fetch logged-in user profile and first dog to compare
        const myUser = await db.getUserById(ctx.user.id);
        const myDogs = await db.getDogsByUserId(ctx.user.id);
        const myDog = myDogs && myDogs.length > 0 ? myDogs[0] : null;

        const myDogProfile = buildDogProfile(myDog);
        const myMasterProfile = buildMasterProfile(myUser);

        // Dynamically compute compatibility and affinities for each duo
        const withCompatibility = filteredDuos.map(d => {
          const targetDog = d.dogs && d.dogs.length > 0 ? d.dogs[0] : null;
          const targetDogProfile = buildDogProfile(targetDog);
          const targetMasterProfile = buildMasterProfile(d.user);

          const comp = calculateCompatibility(myDogProfile, myMasterProfile, targetDogProfile, targetMasterProfile);
          const affs = getAffinities(myDogProfile, myMasterProfile, targetDogProfile, targetMasterProfile);

          return {
            ...d,
            compatibility: comp,
            affinities: affs,
          };
        });

        // Sort: highest compatibility first
        withCompatibility.sort((a, b) => (b.compatibility?.overallScore || 0) - (a.compatibility?.overallScore || 0));

        logger.swipe(
          ctx.user.id, 
          0, 
          false, 
          false, 
          `Fetched, calculated, and sorted ${withCompatibility.length} discovery duos by compatibility`
        );
        
        return withCompatibility;
      }),

    // Get active walkers on map
    getActiveWalkers: protectedProcedure
      .input(
        z.object({
          radiusKm: z.number().min(0.5).max(50).default(10),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
      )
      .query(async ({ ctx, input }) => {
        const walkers = await db.getActiveWalkers(input.radiusKm, input.latitude, input.longitude);
        const filtered = walkers.filter(w => w.id !== ctx.user.id);
        const withDogs = await Promise.all(
          filtered.map(async (walker) => ({
            ...walker,
            dogs: await db.getDogsByUserId(walker.id),
          }))
        );
        return withDogs;
      }),

    // Submit a swipe
    swipe: protectedProcedure
      .input(
        z.object({
          targetUserId: z.number(),
          liked: z.boolean(),
          isFavorite: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        logger.swipe(ctx.user.id, input.targetUserId, input.liked, false, "Swipe mutation initiated");

        // Check if user already swiped
        const existingSwipe = await db.getSwipe(ctx.user.id, input.targetUserId);
        if (existingSwipe) {
          logger.swipe(ctx.user.id, input.targetUserId, input.liked, false, "Already swiped on this user");
          throw new TRPCError({ code: "BAD_REQUEST", message: "Already swiped on this user" });
        }

        const freshUser = await db.getUserById(ctx.user.id);
        const bypass = freshUser?.role === "admin" || freshUser?.bypassPaymentLimits || (freshUser?.swipeLimitUntil && freshUser.swipeLimitUntil > new Date());

        if (!bypass) {
          if (!input.isFavorite) {
            const userPlan = freshUser?.plan || "free";
            const config = await db.getPlanConfig(userPlan);
            if (config.maxSwipesPerDay !== -1) {
              const dailySwipes = await db.getDailySwipeCount(ctx.user.id);
              if (dailySwipes >= config.maxSwipesPerDay) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "SWIPE_LIMIT_EXCEEDED" });
              }
            }
          }
        }

        // Create swipe
        await db.createSwipe(ctx.user.id, input.targetUserId, input.liked);

        // Auto-like back for preprod, dev, or seeded profiles (email ending with @example.com or ID >= 100)
        if (input.liked) {
          const targetUserObj = await db.getUserById(input.targetUserId);
          const isSeedUser = targetUserObj?.email?.endsWith("@example.com") || input.targetUserId >= 100;
          const isDevOrPreprod = process.env.NODE_ENV !== "production" || ctx.user.role === "admin";
          
          if (isSeedUser || isDevOrPreprod) {
            const hasReverse = await db.getSwipe(input.targetUserId, ctx.user.id);
            if (!hasReverse) {
              logger.swipe(input.targetUserId, ctx.user.id, true, true, `Auto-simulated swipe back from User ${input.targetUserId} to User ${ctx.user.id}`);
              await db.createSwipe(input.targetUserId, ctx.user.id, true);
            }
          }
        }

        // Check for mutual like (match)
        if (input.liked) {
          const reverseSwipe = await db.getSwipe(input.targetUserId, ctx.user.id);
          if (reverseSwipe && reverseSwipe.liked) {
            // Check if match already exists
            const match1 = await db.getMatch(ctx.user.id, input.targetUserId);
            const match2 = await db.getMatch(input.targetUserId, ctx.user.id);
            const existingMatch = match1 || match2;

            if (existingMatch) {
              logger.swipe(ctx.user.id, input.targetUserId, true, true, `Match already exists with ID ${existingMatch.id}`);
              return { success: true, matched: true };
            }

            // Get user profiles and dogs for compatibility calculation
            const currentUser = await db.getUserById(ctx.user.id);
            const targetUser = await db.getUserById(input.targetUserId);
            const currentUserDogs = await db.getDogsByUserId(ctx.user.id);
            const targetUserDogs = await db.getDogsByUserId(input.targetUserId);

            // Calculate compatibility using the intelligent algorithm
            let overallScore = 50.0;

            if (currentUser && targetUser && currentUserDogs.length > 0 && targetUserDogs.length > 0) {
              try {
                const currentUserDog = currentUserDogs[0];
                const targetUserDog = targetUserDogs[0];

                const compatibilityResult = calculateCompatibility(
                  {
                    breed: currentUserDog.breed || undefined,
                    age: currentUserDog.age || undefined,
                    personality: currentUserDog.personality ? JSON.parse(currentUserDog.personality as unknown as string) : undefined,
                  },
                  {
                    age: currentUser.age || undefined,
                    interests: currentUser.interests ? JSON.parse(currentUser.interests as unknown as string) : undefined,
                    walkingHabits: currentUser.walkingHabits ? [currentUser.walkingHabits] : undefined,
                    whatISeek: currentUser.whatISeek ? JSON.parse(currentUser.whatISeek as unknown as string) : undefined,
                  },
                  {
                    breed: targetUserDog.breed || undefined,
                    age: targetUserDog.age || undefined,
                    personality: targetUserDog.personality ? JSON.parse(targetUserDog.personality as unknown as string) : undefined,
                  },
                  {
                    age: targetUser.age || undefined,
                    interests: targetUser.interests ? JSON.parse(targetUser.interests as unknown as string) : undefined,
                    walkingHabits: targetUser.walkingHabits ? [targetUser.walkingHabits] : undefined,
                    whatISeek: targetUser.whatISeek ? JSON.parse(targetUser.whatISeek as unknown as string) : undefined,
                  }
                );
                overallScore = compatibilityResult.overallScore;
              } catch (calcError) {
                console.error("[Swipe] Failed to calculate compatibility score, using default 50.0:", calcError);
              }
            } else {
              console.info("[Swipe] Missing profile or dog information for compatibility calculation, using default 50.0");
            }

            await db.createMatch(ctx.user.id, input.targetUserId, overallScore);

            const match = await db.getMatch(ctx.user.id, input.targetUserId) || await db.getMatch(input.targetUserId, ctx.user.id);
            const matchId = match?.id || "unknown";

            logger.match(matchId, ctx.user.id, input.targetUserId, overallScore, "Match created successfully");

            // Create notifications for both users
            await db.createNotification(
              ctx.user.id,
              "match",
              "Nouveau match!",
              "Vous avez un nouveau match!"
            );
            await db.createNotification(
              input.targetUserId,
              "match",
              "Nouveau match!",
              "Vous avez un nouveau match!"
            );

            // Fetch user info for webhook details
            const user1 = await db.getUserById(ctx.user.id);
            const user2 = await db.getUserById(input.targetUserId);

            // Trigger n8n webhook
            triggerN8nWebhook("match.created", {
              user1: {
                id: user1?.id,
                name: user1?.name,
                email: user1?.email,
                phoneNumber: user1?.phoneNumber,
              },
              user2: {
                id: user2?.id,
                name: user2?.name,
                email: user2?.email,
                phoneNumber: user2?.phoneNumber,
              },
              compatibilityScore: overallScore,
            });

            logger.swipe(ctx.user.id, input.targetUserId, true, true, `Successfully matched with User ${input.targetUserId}`);
            return { success: true, matched: true };
          }
        }

        logger.swipe(ctx.user.id, input.targetUserId, input.liked, false, `Swipe recorded, not mutual`);
        return { success: true, matched: false };
      }),

    getDailySwipeCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDailySwipeCount(ctx.user.id);
    }),
  }),

  // Matches
  match: router({
    // Get all matches for current user
    getMatches: protectedProcedure.query(async ({ ctx }) => {
      const results = await db.getMatchesForUser(ctx.user.id);
      logger.match("fetch", ctx.user.id, 0, 0, `Fetched ${results.length} matches`);
      return results;
    }),

    // Block / Unmatch a user
    blockUser: protectedProcedure
      .input(
        z.object({
          targetUserId: z.number(),
          isPermanent: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.targetUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot block yourself" });
        }
        await db.blockUser(ctx.user.id, input.targetUserId, input.isPermanent);
        logger.match(
          input.isPermanent ? "block" : "unmatch",
          ctx.user.id,
          input.targetUserId,
          0,
          `User ${input.isPermanent ? "blocked" : "unmatched"} successfully`
        );
        return { success: true };
      }),

    // Get list of blocked users
    getBlockedUsers: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBlockedUsers(ctx.user.id);
    }),

    // Unblock a user
    unblockUser: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.unblockUser(ctx.user.id, input.targetUserId);
        return { success };
      }),
  }),

  // Messages
  message: router({
    // Get messages for a match
    getMessages: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const messages = await db.getMessagesForMatch(input.matchId);
        logger.message(input.matchId, ctx.user.id, "", `Fetched ${messages.length} messages`);
        return messages;
      }),

    // Send a message
    sendMessage: protectedProcedure
      .input(
        z.object({
          matchId: z.number(),
          content: z.string().min(1).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // TODO: Verify user is part of this match
        await db.sendMessage(input.matchId, ctx.user.id, input.content);
        logger.message(input.matchId, ctx.user.id, input.content, "Message sent successfully");

        // Fetch the match details to find the recipient!
        const match = await db.getMatchById(input.matchId);
        if (match) {
          const recipientId = match.userId1 === ctx.user.id ? match.userId2 : match.userId1;
          const sender = await db.getUserById(ctx.user.id);
          const recipient = await db.getUserById(recipientId);

          // Create notification for recipient
          await db.createNotification(
            recipientId,
            "message",
            "Nouveau message",
            `${sender?.name || 'Quelqu\'un'} vous a envoyé un message : "${input.content.length > 30 ? input.content.substring(0, 30) + '...' : input.content}"`
          );

          // Trigger n8n webhook
          triggerN8nWebhook("message.received", {
            matchId: input.matchId,
            content: input.content,
            sender: {
              id: sender?.id,
              name: sender?.name,
              phoneNumber: sender?.phoneNumber,
            },
            recipient: {
              id: recipient?.id,
              name: recipient?.name,
              phoneNumber: recipient?.phoneNumber,
            }
          });
        }

        return { success: true };
      }),
  }),

  // Notifications
  notification: router({
    // Get notifications for current user
    getNotifications: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNotificationsForUser(ctx.user.id);
    }),
  }),

  // Favorites
  favorite: router({
    // Add favorite
    addFavorite: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.targetUserId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot favorite yourself" });
        }

        const freshUser = await db.getUserById(ctx.user.id);
        const bypass = freshUser?.role === "admin" || freshUser?.bypassPaymentLimits || (freshUser?.swipeLimitUntil && freshUser.swipeLimitUntil > new Date());

        if (!bypass) {
          const userPlan = freshUser?.plan || "free";
          const config = await db.getPlanConfig(userPlan);
          if (config.maxFavoritesPerDay !== -1) {
            const dailyFavorites = await db.getDailyFavoriteCount(ctx.user.id);
            if (dailyFavorites >= config.maxFavoritesPerDay) {
              if (freshUser && freshUser.superLikeCredits > 0) {
                await db.updateUserProfile(ctx.user.id, {
                  superLikeCredits: freshUser.superLikeCredits - 1,
                });
              } else {
                throw new TRPCError({ code: "BAD_REQUEST", message: "FAVORITE_LIMIT_EXCEEDED" });
              }
            }
          }
        }

        await db.addFavorite(ctx.user.id, input.targetUserId);
        return { success: true };
      }),

    // Remove favorite
    removeFavorite: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFavorite(ctx.user.id, input.targetUserId);
        return { success: true };
      }),

    // Check if favorite
    isFavorite: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.isFavorite(ctx.user.id, input.targetUserId);
      }),

    // Get all favorites
    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFavorites(ctx.user.id);
    }),
  }),

  // Swipe History
  history: router({
    // Get swipe history
    getSwipeHistory: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return await db.getSwipeHistory(ctx.user.id, input.limit);
      }),
  }),

  // Sponsorship System
  sponsorship: router({
    // Request sponsorship
    requestSponsorship: protectedProcedure
      .input(
        z.object({
          reason: z.string().min(10).max(500),
          frequency: z.enum(["weekly", "biweekly", "monthly"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return { success: true, message: "Sponsorship request submitted" };
      }),

    // Get available sponsors (volunteers)
    getAvailableSponsors: protectedProcedure
      .input(z.object({ radiusKm: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return [];
      }),

    // Accept sponsorship request
    acceptSponsorship: protectedProcedure
      .input(z.object({ elderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return { success: true, message: "Sponsorship accepted" };
      }),

    // Get my sponsorships
    getMySponsors: protectedProcedure.query(async ({ ctx }) => {
      return [];
    }),

    // Rate sponsorship
    rateSponsorship: protectedProcedure
      .input(
        z.object({
          sponsorshipId: z.number(),
          rating: z.number().min(1).max(5),
          review: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return { success: true, message: "Rating submitted" };
      }),
  }),

  // Dog Walking Service System
  walkingService: router({
    // Create walking service offer
    createService: protectedProcedure
      .input(
        z.object({
          title: z.string().min(5).max(100),
          description: z.string().min(10).max(500),
          pricePerWalk: z.number().min(0).optional(),
          frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
          availableDays: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return { success: true, message: "Walking service created", serviceId: 1 };
      }),

    // Get available walking services nearby
    getNearbyServices: protectedProcedure
      .input(z.object({ radiusKm: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return [];
      }),

    // Book walking service
    bookService: protectedProcedure
      .input(
        z.object({
          serviceId: z.number(),
          scheduledDate: z.date(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return { success: true, message: "Booking confirmed", bookingId: 1 };
      }),

    // Get my bookings
    getMyBookings: protectedProcedure.query(async ({ ctx }) => {
      return [];
    }),

    // Rate walking service
    rateService: protectedProcedure
      .input(
        z.object({
          bookingId: z.number(),
          rating: z.number().min(1).max(5),
          review: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return { success: true, message: "Rating submitted" };
      }),
  }),

  // Events System
  events: router({
    createEvent: protectedProcedure
      .input(
        z.object({
          title: z.string().min(5).max(255),
          description: z.string().min(10).max(1000),
          eventType: z.string(),
          location: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          eventDate: z.date(),
          duration: z.number().min(15),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const eventId = await createEvent({
          organizerId: ctx.user.id,
          ...input,
        });
        const user = await db.getUserById(ctx.user.id);
        triggerN8nWebhook("event.created", {
          organizerId: ctx.user.id,
          organizerName: user?.name,
          title: input.title,
          description: input.description,
          eventType: input.eventType,
          location: input.location,
          eventDate: input.eventDate,
        });
        return { success: !!eventId, eventId };
      }),

    getNearbyEvents: protectedProcedure
      .input(z.object({ latitude: z.number(), longitude: z.number(), radiusKm: z.number().default(10), eventType: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return getNearbyEvents(ctx.user.id, input.latitude, input.longitude, input.radiusKm, input.eventType);
      }),

    joinEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await joinEvent(ctx.user.id, input.eventId);
        return { success };
      }),

    getMyEvents: protectedProcedure.query(async ({ ctx }) => {
      return [];
    }),

    rateEvent: protectedProcedure
      .input(
        z.object({
          eventId: z.number(),
          rating: z.number().min(1).max(5),
          review: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return { success: true };
      }),
  }),

  // Lost & Found Dogs System
  lostDogs: router({
    reportLostDog: protectedProcedure
      .input(
        z.object({
          dogId: z.number(),
          description: z.string().max(500),
          lostDate: z.date(),
          lostLocation: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          reward: z.string().optional(),
          contactPhone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reportId = await reportLostDog({
          ...input,
          userId: ctx.user.id,
        });
        const user = await db.getUserById(ctx.user.id);
        const dog = await db.getDogById(input.dogId);
        triggerN8nWebhook("dog.lost", {
          userId: ctx.user.id,
          userName: user?.name,
          userPhone: user?.phoneNumber,
          dogId: input.dogId,
          dogName: dog?.name,
          description: input.description,
          lostLocation: input.lostLocation,
          reward: input.reward,
          contactPhone: input.contactPhone || user?.phoneNumber,
        });
        return { success: !!reportId, reportId };
      }),

    getNearbyLostDogs: protectedProcedure
      .input(z.object({ latitude: z.number(), longitude: z.number(), radiusKm: z.number().default(25) }))
      .query(async ({ ctx, input }) => {
        return getNearbyLostDogs(input.latitude, input.longitude, input.radiusKm);
      }),

    reportSighting: protectedProcedure
      .input(
        z.object({
          lostDogId: z.number(),
          location: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          sightingDate: z.date(),
          description: z.string().max(500),
          confidence: z.enum(["certain", "likely", "possible"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const sightingId = await reportSighting({
          ...input,
          userId: ctx.user.id,
        });
        return { success: !!sightingId, sightingId };
      }),

    getSightings: protectedProcedure
      .input(z.object({ lostDogId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getSightings(input.lostDogId);
      }),

    markAsFound: protectedProcedure
      .input(z.object({ lostDogId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return { success: true };
      }),
  }),
  // Reviews & Ratings System
  reviews: router({
    createReview: protectedProcedure
      .input(
        z.object({
          reviewedId: z.number(),
          matchId: z.number().optional(),
          rating: z.number().min(1).max(5),
          comment: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reviewId = await db.createReview({
          reviewerId: ctx.user.id,
          reviewedId: input.reviewedId,
          matchId: input.matchId,
          rating: input.rating,
          comment: input.comment,
        });
        return { success: !!reviewId, reviewId };
      }),
    getReviewsForUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getReviewsForUser(input.userId);
      }),
    getAverageRating: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getAverageRating(input.userId);
      }),
  }),
  // Identity Verification System
  verification: router({
    submitVerification: protectedProcedure
      .input(
        z.object({
          photoUrl: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const verificationId = await db.createVerification({
          userId: ctx.user.id,
          photoUrl: input.photoUrl,
          status: "pending",
        });
        return { success: !!verificationId, verificationId };
      }),
    getVerification: protectedProcedure.query(async ({ ctx }) => {
      return db.getVerificationForUser(ctx.user.id);
    }),
    approveVerification: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateVerificationStatus(input.userId, "approved");

        const targetUser = await db.getUserById(input.userId);
        triggerN8nWebhook("verification.updated", {
          userId: input.userId,
          status: "approved",
          name: targetUser?.name,
          phoneNumber: targetUser?.phoneNumber,
        });

        return { success: true };
      }),
    rejectVerification: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateVerificationStatus(input.userId, "rejected", input.reason);

        const targetUser = await db.getUserById(input.userId);
        triggerN8nWebhook("verification.updated", {
          userId: input.userId,
          status: "rejected",
          reason: input.reason,
          name: targetUser?.name,
          phoneNumber: targetUser?.phoneNumber,
        });

        return { success: true };
      }),
  }),

  admin: router({
    getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getAdminStats();
    }),

    getUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getAdminUsers();
    }),

    updateUser: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(["user", "admin"]).optional(),
          plan: z.enum(["free", "premium", "vip"]).optional(),
          phoneNumber: z.string().optional(),
          age: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.role !== undefined) updateData.role = input.role;
        if (input.plan !== undefined) updateData.plan = input.plan;
        if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber;
        if (input.age !== undefined) updateData.age = input.age;

        await db.updateUserProfile(input.userId, updateData);
        return { success: true };
      }),

    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const success = await db.deleteUserAdmin(input.userId);
        return { success };
      }),

    getPlanSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getPlanSettings();
    }),

    updatePlanSettings: protectedProcedure
      .input(
        z.object({
          plan: z.string(),
          maxSwipesPerDay: z.number().int(),
          maxFavoritesPerDay: z.number().int(),
          price: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const success = await db.updatePlanSettings(
          input.plan,
          input.maxSwipesPerDay,
          input.maxFavoritesPerDay,
          input.price
        );
        return { success };
      }),

    getServerStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const mem = process.memoryUsage();
      const uptime = process.uptime();
      const cpu = process.cpuUsage();

      let n8nStatus = "Configuré";
      let n8nLatency = "N/A";
      const n8nUrl = process.env.N8N_WEBHOOK_URL;
      if (n8nUrl) {
        const start = Date.now();
        try {
          const parsed = new URL(n8nUrl);
          const healthUrl = `${parsed.protocol}//${parsed.host}/healthz`;
          await axios.get(healthUrl, { timeout: 2000 });
          n8nStatus = "En ligne";
          n8nLatency = `${Date.now() - start} ms`;
        } catch (err: any) {
          n8nStatus = "Pas de réponse / Hors ligne";
          if (err.response) {
            n8nStatus = `En ligne (${err.response.status})`;
            n8nLatency = `${Date.now() - start} ms`;
          }
        }
      } else {
        n8nStatus = "Non configuré (Pas d'URL)";
      }

      return {
        memory: {
          rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        },
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        cpu: {
          user: `${(cpu.user / 1000000).toFixed(2)}s`,
          system: `${(cpu.system / 1000000).toFixed(2)}s`,
        },
        n8n: {
          status: n8nStatus,
          latency: n8nLatency,
          url: n8nUrl || "Non renseignée",
        }
      };
    }),

    getLogs: protectedProcedure
      .input(
        z.object({
          logFile: z.enum(["auth.log", "swipe.log", "match.log", "message.log", "database.log"]),
          linesCount: z.number().int().default(100),
        })
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const logPath = path.join(process.cwd(), "logs", input.logFile);
        if (!fs.existsSync(logPath)) {
          return [`[Système] Le fichier de log ${input.logFile} n'existe pas encore.`];
        }

        try {
          const content = fs.readFileSync(logPath, "utf8");
          const lines = content.split("\n").filter(Boolean);
          return lines.slice(-input.linesCount);
        } catch (error: any) {
          return [`[Erreur] Impossible de lire le fichier de log : ${error.message}`];
        }
      }),

    togglePaymentBypass: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          bypass: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.togglePaymentBypass(input.userId, input.bypass);
        return { success: true };
      }),

    getPayments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.getAdminPayments();
    }),

    listTables: protectedProcedure
      .input(z.object({ target: z.enum(["preprod", "prod"]) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.adminListTables(input.target);
      }),

    getTableSchema: protectedProcedure
      .input(z.object({ target: z.enum(["preprod", "prod"]), table: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.adminGetTableSchema(input.target, input.table);
      }),

    getTableRows: protectedProcedure
      .input(z.object({ target: z.enum(["preprod", "prod"]), table: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.adminGetTableRows(input.target, input.table);
      }),

    insertTableRow: protectedProcedure
      .input(
        z.object({
          target: z.enum(["preprod", "prod"]),
          table: z.string(),
          rowData: z.record(z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.adminInsertTableRow(input.target, input.table, input.rowData);
      }),

    updateTableRow: protectedProcedure
      .input(
        z.object({
          target: z.enum(["preprod", "prod"]),
          table: z.string(),
          primaryKey: z.string(),
          primaryValue: z.any(),
          rowData: z.record(z.any()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.adminUpdateTableRow(
          input.target,
          input.table,
          input.primaryKey,
          input.primaryValue,
          input.rowData
        );
      }),

    deleteTableRowCascade: protectedProcedure
      .input(
        z.object({
          target: z.enum(["preprod", "prod"]),
          table: z.string(),
          primaryKey: z.string(),
          primaryValue: z.any(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.adminDeleteTableRowCascade(
          input.target,
          input.table,
          input.primaryKey,
          input.primaryValue
        );
      }),
  }),

  // Payments & Credits
  payment: router({
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPaymentsForUser(ctx.user.id);
    }),

    purchasePackage: protectedProcedure
      .input(
        z.object({
          packageType: z.enum(["extra_favorites", "unlimited_swipes", "premium_pass"]),
          paymentMethod: z.enum(["card", "google_pay", "apple_pay"]),
          cardDetails: z.object({
            number: z.string().optional(),
            expiry: z.string().optional(),
            cvc: z.string().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let amount = 0.0;
        if (input.packageType === "extra_favorites") amount = 1.99;
        else if (input.packageType === "unlimited_swipes") amount = 4.99;
        else if (input.packageType === "premium_pass") amount = 9.99;

        // Record the payment
        await db.recordPayment(ctx.user.id, amount, input.packageType, input.paymentMethod);

        // Apply package credits
        if (input.packageType === "extra_favorites") {
          await db.addSuperLikeCredits(ctx.user.id, 5);
        } else if (input.packageType === "unlimited_swipes") {
          await db.addSwipeLimitExtension(ctx.user.id, 24);
        } else if (input.packageType === "premium_pass") {
          await db.addSwipeLimitExtension(ctx.user.id, 24);
          await db.addSuperLikeCredits(ctx.user.id, 10);
        }

        logger.swipe(ctx.user.id, 0, false, false, `User purchased ${input.packageType} for ${amount}€ via ${input.paymentMethod}`);
        
        // Notify webhook of purchase
        await triggerN8nWebhook("user.purchased_package", {
          userId: ctx.user.id,
          email: ctx.user.email,
          packageType: input.packageType,
          amount,
          paymentMethod: input.paymentMethod,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

export async function triggerN8nWebhook(event: string, data: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("[Webhook] No N8N_WEBHOOK_URL configured, skipping event:", event);
    return;
  }
  try {
    await axios.post(webhookUrl, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });
    console.log(`[Webhook] Sent ${event} to n8n successfully`);
  } catch (error: any) {
    console.error(`[Webhook] Failed to send ${event} to n8n:`, error.message);
  }
}
