export enum SyncStatus {
  Pending = 'Pending',
  Synced = 'Synced',
  Failed = 'Failed',
  Conflict = 'Conflict',
}

export enum SyncAction {
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
}

export enum ConflictStatus {
  Pending = 'Pending',
  Resolved = 'Resolved',
  Ignored = 'Ignored',
}

export enum ConflictResolution {
  UseLocal = 'UseLocal',
  UseServer = 'UseServer',
  Merge = 'Merge',
}
