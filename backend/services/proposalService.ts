// Proposal service with Deno KV operations
import { kv, Proposal, generateId, formatDate } from "../database/kv.ts";

// Create a new proposal
export async function createProposal(proposalData: Omit<Proposal, "id" | "createdAt" | "yesVotes" | "noVotes" | "executed" | "passed" | "votes">): Promise<Proposal> {
  const id = generateId();
  
  const proposal: Proposal = {
    ...proposalData,
    id,
    yesVotes: 0,
    noVotes: 0,
    executed: false,
    passed: false,
    votes: [],
    createdAt: formatDate(),
  };

  // Store the proposal in KV store
  await kv.set(["proposals", id], proposal);

  // Also store in a list for efficient retrieval
  await kv.set(["proposals_list", id], { id });

  // Store in proposer's proposals list
  await kv.set(["user_proposals", proposalData.proposer, id], { id });

  return proposal;
}

// Get all proposals
export async function getAllProposals(): Promise<Proposal[]> {
  const proposals: Proposal[] = [];
  const proposalEntries = kv.list<{ id: string }>({ prefix: ["proposals_list"] });

  for await (const entry of proposalEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const proposalId = entry.value.id;
      const proposalResult = await kv.get<Proposal>(["proposals", proposalId]);
      if (proposalResult.value) {
        proposals.push(proposalResult.value);
      }
    }
  }

  return proposals;
}

// Get proposal by ID
export async function getProposalById(id: string): Promise<Proposal | null> {
  const result = await kv.get<Proposal>(["proposals", id]);
  return result.value || null;
}

// Update proposal
export async function updateProposal(id: string, proposalData: Partial<Proposal>): Promise<Proposal | null> {
  const existingProposal = await getProposalById(id);

  if (!existingProposal) {
    return null;
  }

  const updatedProposal: Proposal = {
    ...existingProposal,
    ...proposalData,
  };

  await kv.set(["proposals", id], updatedProposal);
  return updatedProposal;
}

// Delete proposal
export async function deleteProposal(id: string): Promise<boolean> {
  const existingProposal = await getProposalById(id);

  if (!existingProposal) {
    return false;
  }

  // Remove from main storage
  await kv.delete(["proposals", id]);
  await kv.delete(["proposals_list", id]);

  // Remove from proposer's proposals list
  await kv.delete(["user_proposals", existingProposal.proposer, id]);

  return true;
}

// Get proposals by proposer
export async function getProposalsByProposer(proposer: string): Promise<Proposal[]> {
  const proposals: Proposal[] = [];
  const proposalEntries = kv.list<{ id: string }>({ prefix: ["user_proposals", proposer] });

  for await (const entry of proposalEntries) {
    if (entry.value && typeof entry.value === 'object' && 'id' in entry.value) {
      const proposalId = entry.value.id;
      const proposalResult = await kv.get<Proposal>(["proposals", proposalId]);
      if (proposalResult.value) {
        proposals.push(proposalResult.value);
      }
    }
  }

  return proposals;
}

// Vote on a proposal
export async function voteOnProposal(id: string, voter: string, support: boolean, votes: number): Promise<Proposal | null> {
  const existingProposal = await getProposalById(id);

  if (!existingProposal) {
    return null;
  }

  // Check if proposal is still active
  const now = new Date();
  const endTime = new Date(existingProposal.endTime);
  
  if (now > endTime || existingProposal.executed) {
    throw new Error("Proposal is no longer active");
  }

  const proposalVotes = existingProposal.votes || [];
  
  // Check if voter has already voted
  const existingVoteIndex = proposalVotes.findIndex(v => v.voter === voter);
  
  if (existingVoteIndex !== -1) {
    throw new Error("Voter has already voted on this proposal");
  }

  // Add vote
  proposalVotes.push({
    voter,
    support,
    votes
  });

  // Update vote counts
  const yesVotes = support ? existingProposal.yesVotes + votes : existingProposal.yesVotes;
  const noVotes = support ? existingProposal.noVotes : existingProposal.noVotes + votes;

  // Update proposal
  return updateProposal(id, { 
    votes: proposalVotes,
    yesVotes,
    noVotes
  });
}

// Execute a proposal
export async function executeProposal(id: string): Promise<Proposal | null> {
  const existingProposal = await getProposalById(id);

  if (!existingProposal) {
    return null;
  }

  // Check if proposal is already executed
  if (existingProposal.executed) {
    throw new Error("Proposal is already executed");
  }

  // Check if proposal has ended
  const now = new Date();
  const endTime = new Date(existingProposal.endTime);
  
  if (now < endTime) {
    throw new Error("Proposal voting period has not ended yet");
  }

  // Determine if proposal passed
  const passed = existingProposal.yesVotes > existingProposal.noVotes;

  // Update proposal
  return updateProposal(id, { 
    executed: true,
    passed
  });
}

// Get active proposals
export async function getActiveProposals(): Promise<Proposal[]> {
  const allProposals = await getAllProposals();
  const now = new Date();
  
  return allProposals.filter(proposal => {
    const endTime = new Date(proposal.endTime);
    return !proposal.executed && now < endTime;
  });
}

// Get completed proposals
export async function getCompletedProposals(): Promise<Proposal[]> {
  const allProposals = await getAllProposals();
  
  return allProposals.filter(proposal => proposal.executed);
}
