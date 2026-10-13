/**
 * LeadProvider interface for extensible data sources.
 * Real providers (Google Places, Apollo, etc.) implement this interface.
 * In P0 only synthetic seed data is used.
 */
import type { RawCompany, BuyBox } from '@radar/shared';

export interface LeadProvider {
  readonly name: string;
  search(buyBox: BuyBox): Promise<RawCompany[]>;
}
