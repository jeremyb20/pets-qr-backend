// models/Feedback.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  type: 'improvement' | 'bug' | 'suggestion' | 'question' | 'general_feedback';
  title?: string;
  description?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;

  // Campos específicos para general_feedback
  rating?: number;
  reason?: string;
  improvements?: string[];
  comments?: string;
  contact?: {
    email?: string;
    phone?: string;
    consent?: boolean;
  };

  user: {
    id?: string;
    email?: string;
    name?: string;
    phone?: string;
  };
  metadata: {
    url?: string;
    userAgent?: string;
    screenSize?: string;
    language?: string;
    trigger?: 'manual' | 'auto' | 'after_action';
    timestamp: Date;
  };
  status: 'pending' | 'reviewing' | 'in-progress' | 'completed' | 'rejected';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'improvement',
        'bug',
        'suggestion',
        'question',
        'general_feedback',
      ],
      required: true,
    },
    title: {
      type: String,
      trim: true,
      // Solo requerido para tipos que no son general_feedback
      required: function (this: any) {
        return this.type !== 'general_feedback';
      },
    },
    description: {
      type: String,
      trim: true,
      // Solo requerido para tipos que no son general_feedback
      required: function (this: any) {
        return this.type !== 'general_feedback';
      },
    },
    steps: {
      type: String,
      default: '',
    },
    expected: {
      type: String,
      default: '',
    },
    actual: {
      type: String,
      default: '',
    },

    // Campos específicos para general_feedback
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    reason: {
      type: String,
      trim: true,
    },
    improvements: {
      type: [String],
      default: [],
    },
    comments: {
      type: String,
      trim: true,
    },
    contact: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      consent: {
        type: Boolean,
        default: false,
      },
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    category: {
      type: String,
      default: 'Other',
    },
    user: {
      id: String,
      email: String,
      name: String,
      phone: String,
    },
    metadata: {
      url: String,
      userAgent: String,
      screenSize: String,
      language: String,
      trigger: {
        type: String,
        enum: ['manual', 'auto', 'after_action'],
        default: 'manual',
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'in-progress', 'completed', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas eficientes
FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, createdAt: -1 });
FeedbackSchema.index({ rating: 1 });

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
