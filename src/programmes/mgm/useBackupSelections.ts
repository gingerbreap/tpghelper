/** @deprecated Prefer `hooks/useWishlist` — backup is now the unified wishlist. */
export {
  useWishlist as useBackupSelections,
  type WishlistToggleResult as BackupToggleResult,
} from '../../hooks/useWishlist'
export {
  groupSelectionsByType as groupBackupByType,
  reorderWithinCategory,
} from '../../utils/selectionGroups'
