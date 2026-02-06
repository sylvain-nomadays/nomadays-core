/**
 * Hooks exports
 */

// Core API hook
export { useApi, useMutation } from './useApi';
export type { ApiError } from './useApi';

// Authentication
export { useAuth } from './useAuth';

// Domain hooks
export * from './useTrips';
export * from './useSuppliers';
export * from './useContracts';
export * from './useDashboard';
export * from './useDossiers';
export * from './useTravelThemes';
export * from './useExchangeRates';
