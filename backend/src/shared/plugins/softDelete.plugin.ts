import { Schema, Document, Model, Query } from 'mongoose';

export interface ISoftDeleteDocument extends Document {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  softDelete(deletedBy?: string): Promise<this>;
  restore(): Promise<this>;
}

export interface ISoftDeleteModel<T extends ISoftDeleteDocument> extends Model<T> {
  findDeleted(filter?: Record<string, unknown>): Query<T[], T>;
  softDeleteById(id: string, deletedBy?: string): Promise<T | null>;
  restoreById(id: string): Promise<T | null>;
}

export const softDeletePlugin = (schema: Schema): void => {
  // 1. Add Soft Delete Fields
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: null,
    },
  });

  // 2. Query hooks - default exclude soft-deleted unless explicitly requested
  const excludeDeletedMiddleware = function (this: any, next: (err?: Error) => void) {
    const options = this.getOptions();

    // If query explicitly sets includeDeleted: true, do not filter out isDeleted: true
    if (options && options.includeDeleted === true) {
      return next();
    }

    const currentFilter = this.getFilter();
    // Only set isDeleted: false if not explicitly queried
    if (currentFilter.isDeleted === undefined) {
      this.where({ isDeleted: false });
    }

    next();
  };

  schema.pre('find', excludeDeletedMiddleware);
  schema.pre('findOne', excludeDeletedMiddleware);
  schema.pre('findOneAndUpdate', excludeDeletedMiddleware);
  schema.pre('countDocuments', excludeDeletedMiddleware);

  // 3. Document Instance Methods
  schema.methods.softDelete = async function (this: ISoftDeleteDocument, deletedBy?: string) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedBy) {
      this.deletedBy = deletedBy;
    }
    return this.save();
  };

  schema.methods.restore = async function (this: ISoftDeleteDocument) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };

  // 4. Model Static Methods
  schema.statics.findDeleted = function (filter: Record<string, unknown> = {}) {
    return this.find({ ...filter, isDeleted: true });
  };

  schema.statics.softDeleteById = async function (id: string, deletedBy?: string) {
    return this.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy || null,
        },
      },
      { new: true }
    );
  };

  schema.statics.restoreById = async function (id: string) {
    return this.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      },
      { new: true }
    );
  };
};
