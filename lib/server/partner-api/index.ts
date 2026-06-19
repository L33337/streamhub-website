export { getPartnerApi } from './client';
export type {
  PartnerApiClient,
  FetchOptions,
  ListStreamersOptions,
  ListSchedulesOptions,
  ListGamesOptions,
} from './client';
export {
  PartnerApiError,
  PartnerApiAuthError,
  PartnerApiNotFoundError,
  PartnerApiQuotaError,
  PartnerApiServerError,
  PartnerApiNetworkError,
} from './errors';
export type {
  Platform,
  SlotStatus,
  ConfidenceLevel,
  PublicStreamer,
  PublicStreamSlot,
  PublicGame,
  Paginated,
  PaginationInfo,
} from './types';
