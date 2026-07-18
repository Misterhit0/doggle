# 🐕 Woofyz Compatibility Algorithm

## Overview

The Woofyz compatibility engine is a multi-layer scoring system that matches dog owners and their dogs. It supports two distinct matching modes:

1. **Dog-to-Dog Matching (B2C)**: Owner + Dog profile matching
2. **Dog Sitter Matching (B2B)**: Sitter profile matching with dog requirements

## Core Scoring System

### CompatibilityScore Structure

```typescript
{
  dogCompatibility: number;       // 0-100: Dog traits + breed compatibility
  masterCompatibility: number;    // 0-100: Owner interests + lifestyle alignment
  overallScore: number;           // 0-100: Weighted average of dog + master scores
  breakdown: {
    dogTraits: number;            // Personality trait matching
    ageAlignment: number;         // Age proximity scoring
    personalityMatch: number;     // Trait compatibility matrix
    interestAlignment: number;    // Activity/hobby alignment
    seekAlignment: number;        // Life goal alignment
  }
}
```

## Dog-to-Dog Matching (B2C)

### 1. Dog Compatibility Scoring (50 points)

#### Breed Matching
- Uses `BREED_COMPATIBILITY` matrix with predefined compatibility scores (0-100)
- If breed is unknown, defaults to 50 points
- Includes size category penalties (see below)

**Size Categories:**
- Small breeds: Chihuahua, Pomeranian, Pug, Beagle, Dachshund, Shih Tzu, Yorkshire, Jack Russell, French Bulldog
- Medium breeds: Cocker Spaniel, Border Collie, Shiba Inu, Bulldog, Poodle, Australian Shepherd
- Large breeds: Golden Retriever, Labrador, German Shepherd, Boxer, Rottweiler, Great Dane, Bernese Mountain Dog, Siberian Husky

#### Size Penalty System
- **Large vs Small mismatch**: -50 points penalty (unless both have gentle/friendly traits)
- **Gentle/Friendly personalities bypass penalty**: Dogs with "gentle" or "friendly" traits skip the size penalty
- Example: A small friendly Chihuahua can match with a large gentle Golden Retriever at higher scores

#### Age Alignment
- Same age: 100 points
- Each year difference: -5 points
- Minimum: 20 points (keeps old/young pairs viable)

#### Personality Matching
Uses `PERSONALITY_COMPATIBILITY` matrix:
- Same trait: 100 points
- Compatible traits (e.g., "playful" ↔ "energetic"): 85-90 points
- Neutral traits: 40-60 points
- Incompatible traits (e.g., "calm" ↔ "energetic"): 10-40 points
- Direct conflicts (e.g., "gentle" ↔ "aggressive"): 5 points

### 2. Master Compatibility Scoring (50 points)

#### Interest Alignment
- Uses `INTEREST_COMPATIBILITY` matrix
- Compares owners' interests (e.g., hiking, parks, social)
- Scoring: 0-100 for each interest pair
- Minimum: 30 points (keeps mismatched pairs viable)

#### Walking Habits Matching
- Same habits: 100 points
- Compatible habits: 80 points
- No match: 30 points

#### "What I Seek" Alignment
- Matches life goals (friend, mentor, intergenerational, etc.)
- Same seek: 100 points
- No seek info: 50 points (neutral)

### 3. Overall Score Calculation

```
dogCompatibility = (breed + age + personality) / 3
masterCompatibility = (interests + habits + seeks) / 3
overallScore = (dogCompatibility * 0.6) + (masterCompatibility * 0.4)
```

- Dog compatibility is weighted 60% (it's the priority for dog safety)
- Master compatibility is weighted 40%
- Minimum floor: 20 points (keeps all matches discoverable)

---

## Dog Sitter Matching (B2B)

### Overview
Dog sitters have `isDogSitter: true` and provide a `dogSitterBio` describing their services and preferences. The matching algorithm extracts keywords from the bio and matches them against the owner's dog profile.

### Keyword Extraction & Matching

#### Keywords Extracted From:
1. **Dog Personality**: Extracted from `dog.personality[]` array
   - Example: ["playful", "energetic", "social"]

2. **Dog Description**: Tokenized from `dog.description` field
   - Example: "This dog loves hiking in nature and playing with balls." → ["hiking", "nature", "playing"]

3. **Sitter Bio**: Tokenized from `master.dogSitterBio`
   - Example: "We love energetic and playful dogs! We take them hiking and play in nature." → ["energetic", "playful", "hiking", "nature"]

4. **Sitter Interests**: Direct array from `master.interests[]`
   - Example: ["hiking", "parks", "outdoor"]

### Matching Algorithm

**Scoring Logic:**
1. Find overlapping keywords between sitter bio/interests and dog profile/description
2. Each keyword match = +5 points (up to 50 points max from keyword matching)
3. Base score = 40 points (minimum floor for visibility)
4. Final score = Base (40) + Keyword matches (0-50) = **40-90 range**

**Example 1: High Match**
```
Sitter: "We love energetic and playful dogs! We take them hiking..."
Interests: ["hiking", "parks"]

Dog: personality: ["playful", "energetic"]
Description: "This dog loves hiking in nature"

Keywords: playful(+5), energetic(+5), hiking(+5) = +15 → Score: 55
```

**Example 2: Zero Overlap**
```
Sitter: "Quiet apartment sitting"
Interests: ["reading"]

Dog: personality: ["aggressive"]
Description: "Requires structured exercises"

Keywords: none → Score: 40 (base floor)
```

### Keyword Normalization
- Case-insensitive matching
- Whitespace trimmed
- Special characters ignored
- Minimum keyword length: 2 characters (filters noise)

### Affinities Display for Sitters
When a dog owner matches with a sitter, the UI displays:
- Matched keywords/traits
- Common interests
- Sitter profile compatibility summary

---

## Affinities Highlighting

The `getAffinities()` function returns human-readable compatibility insights:

### Dog-to-Dog Affinities
- "⭐ Même race (Breed Name)" — Matching breeds
- "🎂 Même âge (X ans)" — Same age
- "⚽ Très joueur" — Playful personality match
- "🚶 Habitudes de promenades similaires" — Walking habits match
- "❤️ Même vision du compagnon" — Same life goals

### Sitter Affinities
- "Profil: [Sitter name] - [Bio highlight]" — Sitter profile summary
- "🔑 Mots-clés: [matched keywords]" — Extracted keyword matches
- "🎯 Intérêts alignés: [common interests]" — Shared activities

---

## Edge Cases & Defaults

| Scenario | Behavior |
|----------|----------|
| Missing dog breed | Default 50 points (neutral) |
| Missing master info | All components default to 50 points (neutral) |
| No personality traits | Personality match defaults to 50 points |
| No interests | Interest alignment defaults to 50 points |
| Sitter with no bio | Base score 40, no keyword bonuses |
| Very old dog matched with very young dog | Still min 20 points (age penalty floor) |
| All fields missing | Overall score: 50 points (neutral middle ground) |

---

## Testing Strategy

### Test Coverage

**Dog-to-Dog Matching Tests:**
- High-score match (same breed, personality, interests)
- Size penalty enforcement
- Size penalty bypass (gentle/friendly traits)

**Dog Sitter Matching Tests:**
- High keyword overlap (80+ score)
- Zero keyword overlap (40 base score)
- Bio keyword extraction

**Affinities Tests:**
- Standard dog-dog mutual affinities
- Sitter-specific keyword affinities

### Running Tests

```bash
# Run all tests
pnpm test --run

# Run specific test file
pnpm test server/compatibilityEngine.test.ts --run

# Run with watch mode
pnpm test
```

---

## Performance Considerations

- **Time Complexity**: O(n×m) where n = keywords in bio, m = keywords in dog profile
- **Space Complexity**: O(1) - fixed lookup tables
- **Optimization**: Keyword matching is case-insensitive with early termination

---

## Future Enhancements

1. **Machine Learning Integration**: Train model on successful matches
2. **Temporal Weighting**: Boost sitter availability windows
3. **Geographic Proximity**: Add distance-based scoring
4. **Breed-Specific Sitter Certifications**: Bonus for specialized training
5. **User Feedback Loop**: Learn from swipes and rejections

---

## Code References

- **Main Implementation**: `shared/compatibilityEngine.ts`
- **Tests**: `server/compatibilityEngine.test.ts`, `server/dogsittingFriendly.test.ts`
- **Integration Points**:
  - Discovery route: `server/routers.ts` (getNearbyUsers)
  - Swipe handler: Passes compatibility score to match creation
  - Database: `drizzle/schema.ts` (isDogSitter, dogSitterBio fields)

