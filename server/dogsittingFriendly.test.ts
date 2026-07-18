import { describe, expect, it } from "vitest";

// Mock helper representing candidate filtering logic in getNearbyUsers
function filterCandidates(currentUser: { isDogSitter: boolean; dogsittingFriendly: boolean }, allUsers: Array<{ id: number; isDogSitter: boolean; dogsittingFriendly: boolean }>) {
  return allUsers.filter(user => {
    // If current user is a dog sitter, target must be dogsitting friendly
    if (currentUser.isDogSitter && !user.dogsittingFriendly) {
      return false;
    }
    
    // If target is a dog sitter, current user must be dogsitting friendly
    if (user.isDogSitter && !currentUser.dogsittingFriendly) {
      return false;
    }
    
    return true;
  });
}

// Mock helper representing message limit logic in routers.ts
function canSendMessage(params: {
  senderPlan: string;
  isBypassActive: boolean;
  activeDiscussionsCount: number;
  isExistingDiscussion: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.isBypassActive) {
    return { allowed: true };
  }

  // If it's an existing active conversation, always allow
  if (params.isExistingDiscussion) {
    return { allowed: true };
  }

  const limit = params.senderPlan === "free" ? 3 : -1;
  
  if (limit !== -1 && params.activeDiscussionsCount >= limit) {
    return { 
      allowed: false, 
      reason: `Limite de discussions active atteinte (${limit}). Veuillez passer à l'offre WoofPass Premium pour des discussions illimitées.` 
    };
  }

  return { allowed: true };
}

describe("DogSitter & Owner Match Filtering", () => {
  it("allows standard owners to match with standard owners", () => {
    const ownerA = { id: 1, isDogSitter: false, dogsittingFriendly: false };
    const ownerB = { id: 2, isDogSitter: false, dogsittingFriendly: false };
    const result = filterCandidates(ownerA, [ownerB]);
    expect(result).toHaveLength(1);
  });

  it("prevents dog sitter from matching with owner who is not dogsitting friendly", () => {
    const sitter = { id: 1, isDogSitter: true, dogsittingFriendly: false };
    const owner = { id: 2, isDogSitter: false, dogsittingFriendly: false };
    const result = filterCandidates(sitter, [owner]);
    expect(result).toHaveLength(0);
  });

  it("allows dog sitter to match with owner who is dogsitting friendly", () => {
    const sitter = { id: 1, isDogSitter: true, dogsittingFriendly: false };
    const owner = { id: 2, isDogSitter: false, dogsittingFriendly: true };
    const result = filterCandidates(sitter, [owner]);
    expect(result).toHaveLength(1);
  });

  it("prevents owner from matching with dog sitter if owner is not dogsitting friendly", () => {
    const owner = { id: 1, isDogSitter: false, dogsittingFriendly: false };
    const sitter = { id: 2, isDogSitter: true, dogsittingFriendly: true };
    const result = filterCandidates(owner, [sitter]);
    expect(result).toHaveLength(0);
  });

  it("allows owner to match with dog sitter if owner is dogsitting friendly", () => {
    const owner = { id: 1, isDogSitter: false, dogsittingFriendly: true };
    const sitter = { id: 2, isDogSitter: true, dogsittingFriendly: true };
    const result = filterCandidates(owner, [sitter]);
    expect(result).toHaveLength(1);
  });
});

describe("Messaging limits for Standard and Premium users", () => {
  it("allows message if within limit (2 active, limit is 3)", () => {
    const res = canSendMessage({
      senderPlan: "free",
      isBypassActive: false,
      activeDiscussionsCount: 2,
      isExistingDiscussion: false
    });
    expect(res.allowed).toBe(true);
  });

  it("blocks message if limit reached (3 active, limit is 3, new discussion)", () => {
    const res = canSendMessage({
      senderPlan: "free",
      isBypassActive: false,
      activeDiscussionsCount: 3,
      isExistingDiscussion: false
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("WoofPass Premium");
  });

  it("allows message if limit reached but is an existing active discussion", () => {
    const res = canSendMessage({
      senderPlan: "free",
      isBypassActive: false,
      activeDiscussionsCount: 3,
      isExistingDiscussion: true
    });
    expect(res.allowed).toBe(true);
  });

  it("allows premium users to have unlimited active discussions", () => {
    const res = canSendMessage({
      senderPlan: "premium",
      isBypassActive: false,
      activeDiscussionsCount: 20,
      isExistingDiscussion: false
    });
    expect(res.allowed).toBe(true);
  });

  it("allows VIP users to have unlimited active discussions", () => {
    const res = canSendMessage({
      senderPlan: "vip",
      isBypassActive: false,
      activeDiscussionsCount: 50,
      isExistingDiscussion: false
    });
    expect(res.allowed).toBe(true);
  });

  it("allows message if bypass limits flag is active", () => {
    const res = canSendMessage({
      senderPlan: "free",
      isBypassActive: true,
      activeDiscussionsCount: 10,
      isExistingDiscussion: false
    });
    expect(res.allowed).toBe(true);
  });
});
