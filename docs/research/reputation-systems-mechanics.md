# Research: Reputation System Mechanics — HN Karma, SO Reputation, EigenTrust, Web of Trust

## Research Question

> Research Hacker News karma system in detail, Stack Overflow's reputation system, Reddit's karma system, and compare them. Also research manipulation-resistant reputation systems: EigenTrust algorithm, Web of Trust concepts, and how eBay's feedback system evolved over time.

## Research Methodology

The agent performed **36 tool calls** across web searches and documentation fetches, covering:
- Hacker News undocumented features and ranking algorithm analysis
- Stack Overflow official documentation on reputation, privileges, bounties, and badges
- Reddit karma mechanics, anti-manipulation systems, and known exploits
- Academic papers on EigenTrust (Stanford), Sybil attack defenses, and manipulation-resistant reputation
- PGP Web of Trust documentation and analysis
- eBay feedback system historical evolution (1998-present)
- Sybilproof reputation mechanism research (Cheng & Friedman)

Total research time: ~5.5 minutes. Total tokens processed: ~70,000.

---

## 1. Hacker News Karma System

### How Karma Works

**Earning karma**: Karma = total upvotes received on your submissions and comments minus total downvotes received. Each upvote on your content gives you +1 karma; each downvote gives you -1 karma. There is no time decay on karma itself -- once earned, it stays.

**Comment scoring**: All comments start at 1 point. The score is hidden from everyone except the author. The minimum comment score is **-4 points** -- additional downvotes below -4 still subtract from the author's karma, but the visible score floor stays at -4.

**Downvote restrictions**:
- Cannot downvote until you have **501 karma**
- Cannot downvote direct replies to your own comments (prevents revenge downvoting)
- Cannot downvote comments older than 24 hours
- Can un-vote within 1 hour of voting; after that, votes are permanent

### Story Ranking Formula

The front page ranking uses:

```
score = ((votes - 1)^0.8) / ((age_hours + 2)^1.8) * penalties
```

- **Gravity** = 1.8 (the time decay exponent)
- The `-1` removes the submitter's own upvote
- Articles are reranked individually when upvoted; every 30 seconds, one of the top 50 stories is randomly reranked

**Penalty system** (applied to stories, not comments):

| Penalty Type | Factor | Trigger |
|---|---|---|
| Controversy / flamewar | `(votes/comments)^2` or `^3` | 40+ comments AND more comments than upvotes |
| Blank URL (Ask HN) | 0.4 | No URL in submission |
| Lightweight content | 0.17 | Detected as shallow |
| Popular domains (GitHub, Reddit, Medium, YouTube, etc.) | 0.25-0.8 | Auto-applied by domain |
| NSA-related | 0.4 | Topic detection |
| Gag/joke posts | 0.1 | Moderator-applied |
| Buried stories | 0.001 | Flagged to oblivion |

Approximately **20% of front-page stories** and **38% of second-page stories** have active penalties.

### Karma-Gated Privileges

| Karma Threshold | Privilege |
|---|---|
| 0 | Submit stories, post comments |
| 31 | Flag submissions and comments, vouch for [dead] content |
| 251 | Customize top bar color |
| 501 | Downvote comments |

**Flagging** acts as a "super downvote" -- enough flags kill a submission entirely. **Vouching** restores [dead] content that was killed by flags or software.

**Shadowbanning**: Both users and domains can be shadowbanned. All content appears [dead] instantly. Only users with "showdead" enabled in their profile see it.

### Why HN Karma is Considered Trustworthy

1. **High downvote threshold (501)**: Prevents new/throwaway accounts from silencing content. You must contribute significantly before you can suppress others.
2. **Active human moderation**: dang (Daniel Gackle) and other moderators actively penalize flamewars, edit titles, and kill low-quality content. It is not purely algorithmic.
3. **Voting ring detection**: Automated systems detect coordinated upvoting. Caught submissions are blocked from the front page. One upvote per IP address.
4. **Anti-flamewar mechanics**: The controversy penalty automatically demotes heated threads. Reply links are hidden at 3+ depth for young comments to slow arguments.
5. **Comment score opacity**: Only the author sees the score, preventing bandwagoning.
6. **Focused community**: The niche (tech/startups) self-selects for a specific audience, unlike general platforms.

### Weaknesses

1. **No transparency on penalties**: Users cannot see when or why their submissions are penalized. About 20% of front-page stories have invisible penalties.
2. **Moderator opacity**: Moderator actions (title edits, story kills, flag-kills) happen silently. There is no public moderation log.
3. **Submission karma incentive misalignment**: Users get karma for submitting popular links they did not create, encouraging "submission farming" of anything that might trend.
4. **Groupthink**: With no visible vote breakdown (up vs. down), users only see net score. A comment with 50 upvotes and 49 downvotes looks the same as one with 1 upvote.
5. **No karma decay**: An account with 10,000 karma from 2010 retains all privileges even if it has not contributed in years.
6. **Single dimension**: Karma does not distinguish between quality-of-submissions karma and quality-of-comments karma.

### Sources

- [Hacker News FAQ](https://news.ycombinator.com/newsfaq.html)
- [Hacker News Undocumented (minimaxir)](https://github.com/minimaxir/hacker-news-undocumented/blob/master/README.md)
- [How Hacker News Ranking Really Works (righto.com)](http://www.righto.com/2013/11/how-hacker-news-ranking-really-works.html)
- [HN discussion on karma thresholds](https://news.ycombinator.com/item?id=16438354)

---

## 2. Stack Overflow Reputation System

### Reputation Point Values Per Action

| Action | Points |
|---|---|
| Your **answer** is upvoted | +10 |
| Your **question** is upvoted | +10 (changed from +5 in Nov 2019) |
| Your answer is **accepted** | +15 |
| You **accept** someone's answer | +2 |
| Suggested edit approved | +2 |
| Bounty awarded to you | +50 to +500 |
| You **downvote** an answer | -1 (costs you reputation) |
| Your post is **downvoted** | -2 |
| Your post is flagged as spam/offensive | -100 |

**Daily reputation cap**: **200 points** from upvotes/downvotes. Bounties and accepted answers bypass this cap.

### Privilege Thresholds

| Reputation | Privilege |
|---|---|
| 1 | Create posts (ask/answer) |
| 5 | Participate in meta |
| 10 | Remove new user restrictions, create wiki posts |
| 15 | **Flag posts**, **upvote** |
| 20 | Talk in chat |
| 50 | **Comment everywhere** |
| 75 | **Set bounties** (50-500 rep) |
| 100 | Edit community wiki, create chat rooms |
| 125 | **Downvote** (costs -1 rep per downvote) |
| 250 | View close/reopen votes |
| 500 | Cast close/reopen votes (on your own questions), retag |
| 1,000 | Show total up/down vote counts |
| 2,000 | **Edit any question or answer** (no approval needed) |
| 3,000 | **Cast close and reopen votes** |
| 5,000 | Approve/reject tag wiki edits |
| 10,000 | **Delete questions**, access moderator tools dashboard |
| 15,000 | **Protect questions** |
| 20,000 | **Trusted user** -- edit tag wikis without approval, access to additional tools |
| 25,000 | Access to site analytics |

### Bounty System

- Minimum bounty: **50 rep**; maximum: **500 rep**
- Funded from your own reputation (non-refundable, even if nobody answers)
- Minimum 75 rep to start a bounty
- Maximum **3 active bounties** per user at once
- Bounty runs for **7 days**; after that, half is auto-awarded to the highest-voted answer (2+ score), or it is lost
- Bounties bypass the 200/day rep cap

### Badge System

Three tiers: **Bronze** (easy), **Silver** (moderate), **Gold** (hard, sustained effort).

Over **66 million badges** have been awarded to 8.6+ million users. Examples:
- **Popular Question** (Bronze): Question viewed 1,000 times -- most common badge (5M+ awarded)
- **Electorate** (Gold): Voted on 600+ questions where 25%+ are on questions
- **Fanatic** (Gold): Visit site 100 consecutive days
- **Tag badges** (Gold): Score 1,000+ in answers for a specific tag with 200+ answers

### How SO Compares to HN

| Dimension | Stack Overflow | Hacker News |
|---|---|---|
| Reputation granularity | ~20 privilege tiers | 4 tiers (0, 31, 251, 501) |
| Downvote cost | -1 rep to the downvoter | Free (after 501 karma) |
| Accepted answer bonus | +15 (unique mechanic) | None |
| Bounty system | Yes (50-500 rep) | None |
| Daily cap | 200/day | None |
| Badges/gamification | Extensive 3-tier system | None |
| Moderation model | Community-elected moderators + rep-gated tools | Paid staff moderators |

### Sources

- [Stack Overflow Reputation and Voting](https://internal.stackoverflow.help/en/articles/8775594-reputation-and-voting)
- [Membership Has Its Privileges (SO blog)](https://stackoverflow.blog/2010/10/07/membership-has-its-privileges/)
- [We're Rewarding the Question Askers (SO blog)](https://stackoverflow.blog/2019/11/13/were-rewarding-the-question-askers/)
- [Bounties (SO Help Center)](https://internal.stackoverflow.help/en/articles/8792794-bounties)
- [Stack Overflow Badges Explained (SO blog)](https://stackoverflow.blog/2021/04/12/stack-overflow-badges-explained/)

---

## 3. Reddit Karma System

### Mechanics

**Types of karma**: Post Karma (upvotes on posts) and Comment Karma (upvotes on comments). Total karma is the sum of both. There is also **Awarder Karma** and **Awardee Karma** from giving/receiving awards.

**Non-linear mapping**: Upvotes and karma are NOT 1:1. A post with 25,000 upvotes might generate only ~15,000 karma. The conversion follows a diminishing-returns curve that Reddit keeps intentionally opaque.

**The "Hot" ranking algorithm**:
```
hot_score = log10(max(|ups - downs|, 1)) + (sign * seconds_since_epoch) / 45000
```
- The first 10 upvotes count as much as the next 100, which count as much as the next 1,000 (logarithmic)
- **Early momentum is exponentially more valuable** than late votes
- Time component means new content with moderate votes beats old content with many votes

**Subreddit-specific weight**: Karma earned in larger subreddits may count for more. Subreddit-specific karma (earned within a particular community) matters more for that community's posting restrictions.

### Anti-Manipulation Mechanisms

1. **Vote fuzzing**: Reddit adds fake upvotes and downvotes to displayed scores to confuse bots. The true score is hidden; only approximate values are shown.
2. **Score hiding**: Subreddit moderators can hide comment scores for a configurable period (typically 1-4 hours) to prevent bandwagoning.
3. **Crowd Control**: Moderator tool that auto-collapses comments from low-karma or new accounts during brigading events.
4. **ML-driven detection**: 2019 overhaul introduced machine-learning heuristics for real-time countermeasures, reportedly yielding a **50% drop in successful brigading**.
5. **New user restrictions**: Most subreddits require 10-100 karma before posting; some require 500+ karma or 30-day account age.
6. **Rate limiting**: New or low-karma accounts face posting cooldowns (e.g., 10-minute delays between posts).

### Problems and Weaknesses

1. **Karma farming markets**: Underground markets sell high-karma accounts for **$5-$500** each depending on age, history, and subreddit privileges. This completely undermines the "karma as trust" premise.
2. **Bot armies**: Sophisticated operations farm karma by reposting popular content, then use aged accounts for astroturfing, product promotion, and political manipulation.
3. **AI-generated astroturfing**: Services like "ReplyGuy" automatically generate AI comments that promote products, poisoning organic discussion.
4. **Vote brigading**: Coordinated groups (from Discord, Telegram, or other subreddits) mass-upvote or mass-downvote targeted content.
5. **Echo chamber reinforcement**: Unpopular opinions get downvoted into invisibility, creating feedback loops where only majority-approved content surfaces.
6. **Parasite SEO**: Because Google heavily indexes Reddit, karma-farmed accounts are used to plant product recommendations that then rank in Google search results.
7. **Opacity as security**: Reddit keeps its algorithms secret to prevent gaming, but this also prevents community auditing and breeds distrust.

### Sources

- [Reddit Karma Explained (rupvote)](https://rupvote.com/reddit-karma/)
- [Reddit Upvotes & Comment Karma (mediagrowth.io)](https://mediagrowth.io/reddit/reddit-upvotes-karma/)
- [Reddit Karma Farming Risks (pilotforreddit)](https://pilotforreddit.com/blog/what-is-reddit-karma-farming)
- [AI Poisoning Reddit (404 Media)](https://www.404media.co/ai-is-poisoning-reddit-to-promote-products-and-game-google-with-parasite-seo/)
- [Reddit Overhauls Upvote Algorithm (TechCrunch)](https://techcrunch.com/2016/12/06/reddit-overhauls-upvote-algorithm-to-thwart-cheaters-and-show-the-sites-true-scale/)
- [Brigading and Vote Manipulation (mediaremoval.com)](https://mediaremoval.com/brigading-and-vote-manipulation-on-reddit/)

---

## 4. EigenTrust Algorithm

### Core Concept

Developed by Kamvar, Schlosser, and Garcia-Molina at Stanford. Originally designed for P2P file-sharing networks to isolate peers sharing fake/malicious files. Based on **transitive trust**: if Alice trusts Bob, and Bob trusts Carol, then Alice has some trust in Carol.

### Mathematical Formulation

**Step 1 -- Local trust values**:

For each pair of peers (i, j), compute:
```
s_ij = sat(i,j) - unsat(i,j)
```
Where `sat(i,j)` = number of satisfactory transactions peer i had with peer j, and `unsat(i,j)` = unsatisfactory ones. Negative values are clipped to zero (untrusted-by-default).

**Step 2 -- Normalize local trust**:
```
c_ij = max(s_ij, 0) / sum_j(max(s_ij, 0))
```
This normalization prevents malicious peers from assigning arbitrarily high trust to colluding peers. Each peer's outgoing trust sums to 1.

**Step 3 -- Global trust via matrix convergence**:

Construct matrix C where entry (i,j) = c_ij. The global trust vector **t** is computed iteratively:
```
t(k+1) = C^T * t(k)
```
This is **power iteration** to find the **left principal eigenvector** of C. If C is aperiodic and strongly connected, it converges to a stable global trust vector that is the same for all peers.

**Step 4 -- Pre-trusted peers**:

To guarantee convergence and break malicious collectives, introduce pre-trusted peers vector **p**:
```
t(k+1) = (1 - a) * C^T * t(k) + a * p
```
Where `a` is the **seed confidence** (a percentage, e.g., 0.1-0.5). Higher `a` means pre-trusted peers have more influence. The pre-trusted peers MUST NOT be part of a malicious collective.

### Manipulation Resistance

1. **Normalization** prevents inflating trust for colluding peers
2. **Trust values are not computed by the peer itself** -- a different peer computes your trust value (prevents self-inflation)
3. **Pre-trusted peers** act as anchors that break up collusive clusters
4. **Non-negativity constraint**: Trust cannot go below zero, so attackers cannot "negative-bomb" good peers below baseline

### Limitations

- Requires choosing pre-trusted peers carefully (if compromised, the whole system is compromised)
- Assumes a strongly connected graph (may not hold in sparse networks)
- Cold-start problem for new peers with no transaction history

### EigenTrust++ (Attack-Resilient Extension)

Published by Georgia Tech researchers, adds resilience against strategic manipulation by incorporating additional attack models and defenses for colluding adversaries.

### Sources

- [EigenTrust Original Paper (Stanford)](https://nlp.stanford.edu/pubs/eigentrust.pdf)
- [EigenTrust - Wikipedia](https://en.wikipedia.org/wiki/EigenTrust)
- [EigenTrust | OpenRank Docs](https://docs.openrank.com/reputation-algorithms/eigentrust)
- [EigenTrust++: Attack Resilient Trust Management (Georgia Tech)](https://faculty.cc.gatech.edu/~lingliu/papers/2012/XinxinFan-EigenTrust++.pdf)
- [Developing the EigenTrust Algorithm (Mario Schlosser on Medium)](https://medium.com/oscar-tech/developing-the-eigentrust-algorithm-and-determining-trustworthiness-online-6c51b2c2938f)

---

## 5. Web of Trust (PGP/OpenPGP)

### How It Works

The Web of Trust is a **decentralized trust model** used in PGP/GnuPG. Instead of a single Certificate Authority (PKI model), trust is established through a network of individual endorsements.

**Key signing**: When Alice verifies Bob's identity in person (typically at a **key signing party**), she signs Bob's public key with her private key. This signature says: "Alice certifies that this key belongs to Bob."

**Trust levels** assigned by each user to other users:

| Level | Meaning |
|---|---|
| Unknown | No opinion on trustworthiness |
| None | Known to sign carelessly |
| Marginal | Somewhat trusted to verify identities |
| Full | Completely trusted to verify identities |
| Ultimate | Your own key (implicit) |

### Validation Rules

A key is considered **valid** (trusted to belong to its claimed owner) if:
- Signed by **1 fully-trusted** introducer, OR
- Signed by **3 marginally-trusted** introducers

This is a **vote-counting scheme** configurable by each user.

### Trust Propagation

Trust is transitive but bounded:
- If Alice fully trusts Bob, and Bob signs Carol's key, then Alice considers Carol's key valid
- However, trust does **not** chain indefinitely -- there is a configurable **maximum chain depth** (typically 5 hops)
- Each hop can reduce the trust level

### Strengths

1. **No single point of failure**: Unlike PKI, compromising one authority does not break the whole system
2. **Decentralized**: No central authority needed; anyone can be an introducer
3. **Resilient**: "Essentially unaffected by company failures"
4. **User-controlled**: Each user decides their own trust assignments

### Weaknesses

1. **Cold-start/bootstrapping**: New users with no signatures are untrusted by everyone. Getting initial signatures requires meeting people in person.
2. **Not scalable**: Works in small communities but breaks down at internet scale. Each user must personally manage trust assignments.
3. **Social graph leakage**: The web of trust reveals who knows whom, creating a public social graph.
4. **No revocation broadcast**: If a key is compromised, revoking it requires distributing the revocation certificate, which may not reach all parties.
5. **Trust != competence**: A user might be trusted to verify identities but still make mistakes.

### Sources

- [Web of Trust - Wikipedia](https://en.wikipedia.org/wiki/Web_of_trust)
- [PGP Web of Trust: Delegated Trust and Keyservers (Linux Foundation)](https://www.linuxfoundation.org/blog/blog/pgp-web-of-trust-delegated-trust-and-keyservers)
- [Building Your Web of Trust (GnuPG)](https://www.gnupg.org/gph/en/manual/x547.html)
- [What is Web of Trust? (GeeksforGeeks)](https://www.geeksforgeeks.org/computer-networks/what-is-web-of-trust/)

---

## 6. Manipulation-Resistant Reputation Systems (Academic)

### The Sybil Problem

A **Sybil attack** occurs when an attacker creates many fake identities to gain disproportionate influence. Any reputation system must address this.

### Key Result: No Symmetric Sybilproof Function Exists

Cheng and Friedman (2005) proved that **no symmetric reputation function can be sybilproof**. This means algorithms like PageRank (which treats all nodes symmetrically) can be manipulated by creating fake identities.

**Flow-based and path-based asymmetric methods** are more difficult to manipulate. These are reputation functions where trust flows from designated seed nodes and is bounded by the capacity of paths connecting nodes.

### Social Network-Based Defenses

| Algorithm | Mechanism | Sybils Accepted Per Attack Edge |
|---|---|---|
| **SybilGuard** | Random walks from known-good nodes | O(sqrt(n) * log(n)) |
| **SybilLimit** | Improved random walks with tighter bounds | O(log(n)) |
| **SybilRank** | Short random walks from multiple seed nodes | Ranks Sybils low |
| **Advogato** | Max-flow from seed to target | Flow-bounded |

**Core insight**: In social graphs, there are few edges ("attack edges") between the honest region and the Sybil region. Random walks from honest nodes tend to stay in the honest region. Sybil nodes cannot create many edges into the honest region without real social connections.

### Limitations of Social Graph Approaches

- Assume the social graph is "fast-mixing" (well-connected) in the honest region -- may not hold in practice
- Vulnerable to **widespread small-scale Sybil attacks** (many attackers each creating a few fake nodes)
- Assume attack edges are sparse -- breaks if attackers have many real social connections

### Other Approaches

- **Proof-of-Work**: Require computational work per identity (makes Sybil creation expensive)
- **Proof-of-Stake**: Require economic collateral per identity
- **Identity verification**: Tie accounts to real-world identity (phone number, government ID)
- **Recurring fees**: Charge periodic fees to maintain an account
- **ReCon (Reputation Consensus)**: Uses reputation as the basis for blockchain committee selection, randomizing to increase Sybil attack cost

### Sources

- [Sybilproof Reputation Mechanisms (Cheng & Friedman)](https://www.researchgate.net/publication/228367243_Sybilproof_reputation_mechanisms)
- [Manipulation-Resistant Reputation Systems (Friedman & Resnick)](https://www.researchgate.net/publication/254419367_Manipulation-Resistant_Reputation_Systems)
- [SybilGuard (Yu et al.)](https://www.researchgate.net/publication/3335470_SybilGuard_Defending_Against_Sybil_Attacks_via_Social_Networks)
- [Sybil Attack - Wikipedia](https://en.wikipedia.org/wiki/Sybil_attack)
- [PoW-Based Sybil Attack Resistant Model](https://link.springer.com/chapter/10.1007/978-981-15-9213-3_13)
- [Quantifying Resistance to the Sybil Attack](https://link.springer.com/content/pdf/10.1007/978-3-540-85230-8_1)

---

## 7. eBay Feedback System Evolution

### Phase 1: Bilateral/Mutual Feedback (1998-2007)

**Original design**: Both buyers and sellers could leave Positive, Neutral, or Negative feedback for each other. Feedback score = positives - negatives.

**The "M.A.D." problem**: The system devolved into Mutually Assured Destruction. Sellers would threaten retaliatory negative feedback if a buyer left anything less than positive. Result: buyers were afraid to leave honest negative feedback even when warranted. Empirical data showed feedback was overwhelmingly positive (>99% positive), making it nearly useless for distinguishing good sellers from bad ones.

**Feedback withdrawal**: eBay introduced "mutual feedback withdrawal" where both parties could agree to remove feedback. This was routinely used as a bargaining chip: "I'll withdraw my negative if you withdraw yours."

### Phase 2: Anonymous DSR (May 2007)

**Detailed Seller Ratings (DSR)**: eBay added anonymous 1-5 star ratings on four dimensions:
1. Item as described
2. Communication
3. Shipping time
4. Shipping and handling charges

**Key design**: DSRs were **anonymous** -- sellers could not see which buyer gave which rating. This was supposed to encourage honest feedback without fear of retaliation.

**Problem**: Sellers discovered that a single low DSR could destroy their status/discount eligibility, even with hundreds of positive classic ratings.

### Phase 3: One-Sided Feedback (May 2008)

**The big change**: As of May 20, 2008, **sellers can only leave positive feedback for buyers**. Sellers lost the ability to leave neutral or negative feedback entirely.

**Rationale**: eBay's data showed the mutual system was fundamentally broken. Buyers were systematically intimidated into leaving dishonest positive feedback. The retaliation threat was too powerful.

**Seller backlash**: Sellers protested, arguing buyers could now engage in:
- **Feedback extortion**: Threatening negative feedback to get undeserved refunds
- **Buyer scams**: No accountability for non-paying buyers, unreasonable returns, etc.

### Current System (2008-Present)

- Buyers can leave Positive, Neutral, or Negative feedback for sellers
- Sellers can ONLY leave Positive feedback for buyers
- DSRs remain anonymous
- eBay has expanded its automated feedback removal policies

### Key Lessons for Reputation System Design

1. **Bilateral feedback creates a retaliation equilibrium** that suppresses honest ratings
2. **Anonymity in ratings** is necessary to elicit truthful reports from the less powerful party
3. **One-sided feedback** solves retaliation but creates the opposite exploitation risk
4. **99%+ positive ratings** are a signal that the system is broken, not that everyone is great
5. **The party with more power in the transaction** must be rated by the less powerful party without fear of consequences

### Sources

- [Reputation and Feedback Systems in Online Platform Markets (Tadelis, UC Berkeley)](https://faculty.haas.berkeley.edu/stadelis/Annual_Review_Tadelis.pdf)
- [eBay tweaks feedback, but 'no negatives' is here to stay (CNN, 2008)](https://money.cnn.com/2008/07/14/smallbusiness/ebay_feedback_changes.fsb/index.htm)
- [eBay's Feedback System: Why It's Broken (originalprop.com)](https://www.originalprop.com/blog/2009/03/14/ebays-feedback-system-why-it-is-broken/)
- [Building Web Reputation Systems: eBay's Merchant Feedback System](http://buildingreputation.com/writings/2009/10/ebays_merchant_feedback_system.html)
- [Market Transparency, Adverse Selection, and Moral Hazard (Journal of Political Economy)](https://www.journals.uchicago.edu/doi/full/10.1086/688875)

---

## Summary Comparison Table

| System | Sybil Resistance | Manipulation Resistance | Transparency | Granularity | Cold Start |
|---|---|---|---|---|---|
| **HN Karma** | Moderate (voting ring detection) | Moderate (penalties, moderation) | Low (opaque penalties) | Low (4 privilege tiers) | Easy (submit/comment immediately) |
| **SO Reputation** | Low (easy to create accounts) | High (daily cap, downvote cost, bounded actions) | High (all thresholds public) | Very high (~20 tiers) | Medium (need rep to participate fully) |
| **Reddit Karma** | Low (accounts are free, farming markets exist) | Low (bots, brigading, astroturfing rampant) | Low (fuzzing, opaque algorithms) | Low (mostly cosmetic) | Medium (subreddit minimums) |
| **EigenTrust** | High (normalization, pre-trusted peers) | High (eigenvector convergence, asymmetric) | Medium (algorithm is public, values are global) | Continuous (0-1 trust score) | Poor (no history = no trust) |
| **Web of Trust** | High (requires in-person verification) | High (flow-bounded, depth-limited) | High (all signatures public) | 4 trust levels | Very poor (need physical meetings) |
| **eBay Feedback** | Moderate (tied to transactions) | Low-moderate (evolved from mutual to one-sided) | Medium (DSRs anonymous, classic feedback visible) | 2 systems (binary + 5-star) | Easy (first transaction) |
