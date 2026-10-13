/**
 * @deprecated Use `useWishlist` — backupSelections was merged into wishlist.
 * Kept as aliases so older pack imports keep typechecking during migration.
 */
export {
  useWishlist as useBackupSelections,
  type WishlistToggleResult as BackupToggleResult,
} from './useWishlist'
export {
  groupSelectionsByType as groupBackupByType,
  reorderWithinCategory,
} from '../utils/selectionGroups'
