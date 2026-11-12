import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClientCommunicationDocument extends Document {
  clientId: mongoose.Types.ObjectId;
  clientName?: string;
  clientFileNo?: string;
  messageId: string;
  threadId?: string;
  senderEmail: string;
  senderName?: string;
  from: string;
  subject: string;
  snippet: string;
  date: Date;
  channel: 'email' | 'whatsapp' | 'call' | 'portal';
  direction: 'inbound' | 'outbound';
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientCommunicationSchema = new Schema<IClientCommunicationDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
    },
    clientFileNo: {
      type: String,
      trim: true,
      default: '',
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    threadId: {
      type: String,
      trim: true,
      default: '',
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    senderName: {
      type: String,
      trim: true,
      default: '',
    },
    from: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      default: '(No Subject)',
    },
    snippet: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'call', 'portal'],
      default: 'email',
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
    },
    status: {
      type: String,
      default: 'synced',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for client-specific and chronological queries
clientCommunicationSchema.index({ clientId: 1, date: -1 });
clientCommunicationSchema.index({ senderEmail: 1, date: -1 });

export const ClientCommunicationModel: Model<IClientCommunicationDocument> =
  mongoose.models.ClientCommunication ||
  mongoose.model<IClientCommunicationDocument>('ClientCommunication', clientCommunicationSchema);

