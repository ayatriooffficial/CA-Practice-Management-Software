import { Schema, model } from 'mongoose';
import { ILeadDocument } from './lead.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const leadSchema = new Schema<ILeadDocument>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      index: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
      index: true,
    },
    abbreviation: {
      type: String,
      trim: true,
      default: '',
    },
    dob: {
      type: String,
      trim: true,
    },
    aadhaarMobile: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    panAttachment: {
      type: String,
      default: null,
    },
    aadhaar: {
      type: String,
      trim: true,
      index: true,
    },
    aadhaarAttachment: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Others', 'Transgender', ''],
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    nationality: {
      type: String,
      trim: true,
      default: 'Indian',
    },
    policeStation: {
      type: String,
      trim: true,
      default: '',
    },
    postOffice: {
      type: String,
      trim: true,
      default: '',
    },
    din: {
      type: String,
      trim: true,
      default: '',
    },
    dinAttachment: {
      type: String,
      default: null,
    },
    mcaId: {
      type: String,
      trim: true,
      default: '',
    },
    mcaPassword: {
      type: String,
      select: false, // Hidden by default for security
    },
    referredBy: {
      type: String,
      trim: true,
      default: '',
    },
    photo: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'dropped'],
      default: 'new',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    convertedToClientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.mcaPassword;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Apply Soft Delete Plugin
leadSchema.plugin(softDeletePlugin);

// Compound and Search Indexes
leadSchema.index({ mobile: 1, isDeleted: 1 });
leadSchema.index({ email: 1, isDeleted: 1 });
leadSchema.index({ pan: 1, isDeleted: 1 });
leadSchema.index({ status: 1, isDeleted: 1 });
leadSchema.index(
  {
    fullName: 'text',
    mobile: 'text',
    email: 'text',
    pan: 'text',
    notes: 'text',
  },
  {
    weights: {
      fullName: 10,
      mobile: 8,
      pan: 7,
      email: 5,
      notes: 1,
    },
    name: 'LeadTextSearchIndex',
  }
);

// Pre-save hook: auto-compute fullName
leadSchema.pre('save', function (next) {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  this.fullName = parts.join(' ').trim();
  next();
});

export const Lead = model<ILeadDocument, ISoftDeleteModel<ILeadDocument>>('Lead', leadSchema);
