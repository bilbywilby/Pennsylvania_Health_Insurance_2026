import { IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, Procedure, Benchmark, Claim, ProviderRisk, Embedding, Appeal, ConsensusMapping, TransparencyManifest } from "@shared/types";
import { MOCK_CHAT_MESSAGES, MOCK_CHATS, MOCK_USERS, MOCK_PROCEDURES, MOCK_BENCHMARKS, MOCK_CLAIMS, MOCK_APPEALS, MOCK_CONSENSUS, MOCK_MANIFESTS } from "@shared/mock-data";
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "" };
  static seedData = MOCK_USERS;
}
export class ProcedureEntity extends IndexedEntity<Procedure> {
  static readonly entityName = "procedure";
  static readonly indexName = "procedures";
  static readonly initialState: Procedure = {
    id: "", name: "", cptCode: "", fairPrice: 0, avgPrice: 0, marketRange: [0, 0], description: "", category: ""
  };
  static seedData = MOCK_PROCEDURES;
}
export class BenchmarkEntity extends IndexedEntity<Benchmark> {
  static readonly entityName = "benchmark";
  static readonly indexName = "benchmarks";
  static readonly initialState: Benchmark = { id: "", cptCode: "", localityId: "", medicareRate: 0, fmvMultiplier: 1.0, payer: "", medianAllowed: 0, p10: 0, p90: 0, varianceIndex: 0 };
  static seedData = MOCK_BENCHMARKS;
  static keyOf<U extends { id: string }>(state: U): string {
    return state.id;
  }
}
export class ClaimLedgerEntity extends IndexedEntity<Claim> {
  static readonly entityName = "claim";
  static readonly indexName = "claims";
  static readonly initialState: Claim = {
    id: "", tenantId: "", token: "", cpt: "", billedAmount: 0, locality: "", status: "PENDING", riskLevel: "LOW", timestamp: Date.now()
  };
  static seedData = MOCK_CLAIMS;
}
export class AppealEntity extends IndexedEntity<Appeal> {
  static readonly entityName = "appeal";
  static readonly indexName = "appeals";
  static readonly initialState: Appeal = {
    id: "", tenantId: "", claimId: "", token: "", cpt: "", billedAmount: 0, status: "PENDING", timestamp: Date.now(), notes: ""
  };
  static seedData = MOCK_APPEALS;
}
export class ConsensusEntity extends IndexedEntity<ConsensusMapping> {
  static readonly entityName = "consensus";
  static readonly indexName = "consensus_mappings";
  static readonly initialState: ConsensusMapping = {
    id: "", description: "", suggestedCpt: "", votes: 0, verified: false
  };
  static seedData = MOCK_CONSENSUS;
}
export class ManifestEntity extends IndexedEntity<TransparencyManifest> {
  static readonly entityName = "manifest";
  static readonly indexName = "manifests";
  static readonly initialState: TransparencyManifest = { id: "", payer: "", s3Key: "", signature: "", publishedAt: 0, procedureCount: 0 };
  static seedData = MOCK_MANIFESTS;
}
export class ProviderRiskEntity extends IndexedEntity<ProviderRisk> {
  static readonly entityName = "provider_risk";
  static readonly indexName = "provider_risks";
  static readonly initialState: ProviderRisk = { id: "", tenantId: "", providerToken: "", zScore: 0, riskCategory: "LOW" };
}
export class EmbeddingEntity extends IndexedEntity<Embedding> {
  static readonly entityName = "embedding";
  static readonly indexName = "embeddings";
  static readonly initialState: Embedding = { id: "", sessionId: "", contextHash: "", vector: [], metadata: {} };
}