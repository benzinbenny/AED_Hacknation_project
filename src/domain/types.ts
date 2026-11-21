import { z } from "zod";

export const AccessTypeSchema = z.enum(["public", "customers", "restricted", "private", "unknown"]);
export const OperationalStatusSchema = z.enum(["reported_operational", "reported_out_of_service", "unknown"]);
export const AvailabilityStateSchema = z.enum(["open_by_schedule", "closed_by_schedule", "unknown"]);
export const RecordStatusSchema = z.enum(["active", "temporarily_removed", "removed", "unknown"]);

export const SourceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1),
  fetchedAt: z.string().datetime({ offset: true }),
  sourceDataDate: z.string().date().nullable().optional(),
  sourceUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  upstreamOrigin: z.string().nullable().optional(),
  licenseId: z.string().nullable().optional(),
  attribution: z.string().nullable().optional(),
  rawRecordHash: z.string().nullable().optional(),
});

export const AedRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  externalReference: z.string().nullable().optional(),
  operatorName: z.string().nullable(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  coordinateAccuracyMeters: z.number().min(0).nullable().optional(),
  geography: z.object({
    countryCode: z.string().nullable().optional(),
    voivodeship: z.string().nullable().optional(),
    county: z.string().nullable().optional(),
    municipality: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    terytTerc: z.string().nullable().optional(),
    terytSimc: z.string().nullable().optional(),
  }).optional(),
  placement: z.object({
    indoor: z.enum(["yes", "no", "unknown"]).optional(),
    floor: z.string().nullable().optional(),
    entranceDescription: z.string().nullable().optional(),
  }).optional(),
  timezone: z.string().nullable().optional(),
  address: z.string().nullable(),
  locationDescription: z.string().nullable(),
  accessType: AccessTypeSchema,
  accessNotes: z.string().nullable(),
  availability: z.object({
    rawHours: z.string().nullable(),
    state: AvailabilityStateSchema,
    evaluatedAt: z.string().datetime({ offset: true }).nullable(),
  }),
  operationalStatus: OperationalStatusSchema,
  operationalStatusObservedAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable(),
  verificationMethod: z.string().nullable(),
  verificationActorType: z.enum(["publisher", "field_community", "automated_import", "unknown"]).optional(),
  verificationScope: z.enum(["location", "access", "operational_status", "full", "unknown"]).optional(),
  nextVerificationDueAt: z.string().datetime({ offset: true }).nullable().optional(),
  recordStatus: RecordStatusSchema,
  sources: z.array(SourceReferenceSchema).min(1),
});

export type AccessType = z.infer<typeof AccessTypeSchema>;
export type OperationalStatus = z.infer<typeof OperationalStatusSchema>;
export type AvailabilityState = z.infer<typeof AvailabilityStateSchema>;
export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type AedRecord = z.infer<typeof AedRecordSchema>;

export type SourceReferenceScope = {
  geographyLabel: string;
  geographyLevel: "country" | "voivodeship" | "county" | "municipality" | "locality" | "custom" | "unknown";
  temporalDescription: string;
  sourceDataDate: string | null;
  updateFrequency: string;
  basis: "publisher_declared" | "observed_export" | "unverified";
  limitations: string;
};

export type SourceDescriptor = {
  id: string;
  name: string;
  url: string;
  upstreamOrigin: string;
  licenseId: string;
  attribution: string;
  referenceScope?: SourceReferenceScope;
};

export type ImportIssue = {
  code: "invalid_coordinates" | "outside_poland" | "missing_source_record_id" | "unsupported_geometry" | "invalid_feature";
  severity: "error" | "warning";
  message: string;
  sourceRecordId: string | null;
};

export type ImportResult = {
  records: AedRecord[];
  issues: ImportIssue[];
  rejected: number;
};
