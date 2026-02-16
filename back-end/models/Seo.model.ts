// back-end/models/Seo.ts
import { Schema, model, Types } from 'mongoose';

// Interfaz para el contenido multiidioma
interface ISeoContent {
  language: string; // 'es', 'en', 'fr', etc.
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  metaTags?: Array<{
    name: string;
    content: string;
    attribute?: string; // 'name' o 'property'
  }>;
  structuredData?: object; // JSON-LD u otros formatos
}

// Interfaz principal del SEO
interface ISeo {
  pageId: string; // Identificador único de la página
  route: string; // Ruta de la página (/home, /about, /products/:id)
  contentType: string; // 'page', 'product', 'article', 'category'
  contentId?: Types.ObjectId; // Referencia al contenido relacionado
  multiLanguageContent: ISeoContent[];
  status: 'active' | 'inactive' | 'draft';
  priority: number; // 0.0 - 1.0 para sitemap
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  lastModified: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  _id: Types.ObjectId;
}

export interface SeoFilters {
  pageId?: { $regex: string; $options: string };
  route?: { $regex: string; $options: string };
  status?: string;
  contentType?: string;
  'multiLanguageContent.language'?: string;
  'multiLanguageContent.canonicalUrl'?: {
    $exists: boolean;
    $ne?: string;
    $eq?: string;
  };
  'multiLanguageContent.ogImage'?: {
    $exists: boolean;
    $ne?: string;
    $eq?: string;
  };
  priority?: { $gte?: number; $lte?: number };
  changeFrequency?: string;
  lastModified?: { $gte?: Date; $lte?: Date };
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
}

const SeoContentSchema = new Schema<ISeoContent>({
  language: {
    type: String,
    required: true,
    length: 2,
    uppercase: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 60,
  },
  description: {
    type: String,
    required: true,
    maxlength: 160,
  },
  keywords: [
    {
      type: String,
      maxlength: 50,
    },
  ],
  canonicalUrl: {
    type: String,
    maxlength: 500,
  },
  ogTitle: {
    type: String,
    maxlength: 60,
  },
  ogDescription: {
    type: String,
    maxlength: 160,
  },
  ogImage: {
    type: String,
    maxlength: 500,
  },
  metaTags: [
    {
      name: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      attribute: {
        type: String,
        enum: ['name', 'property'],
        default: 'name',
      },
    },
  ],
  structuredData: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

const SeoSchema = new Schema<ISeo>(
  {
    pageId: {
      type: String,
      required: true,
      unique: false,
    },
    route: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ['page', 'product', 'article', 'category', 'landing'],
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      refPath: 'contentType',
      default: null,
    },
    multiLanguageContent: [SeoContentSchema],
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'draft',
      index: true,
    },
    priority: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.5,
    },
    changeFrequency: {
      type: String,
      enum: [
        'always',
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'yearly',
        'never',
      ],
      default: 'weekly',
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para búsquedas eficientes
SeoSchema.index({ pageId: 1, status: 1 });
SeoSchema.index({ route: 1, status: 1 });
SeoSchema.index({ contentType: 1, contentId: 1 });
SeoSchema.index({ 'multiLanguageContent.language': 1 });

// Índice para búsqueda de texto en títulos y descripciones
SeoSchema.index({
  'multiLanguageContent.title': 'text',
  'multiLanguageContent.description': 'text',
  'multiLanguageContent.keywords': 'text',
});

// Método para obtener contenido por idioma
SeoSchema.methods.getContentByLanguage = function (
  language: string
): ISeoContent | null {
  return (
    this.multiLanguageContent.find(
      (content: ISeoContent) => content.language === language.toUpperCase()
    ) || null
  );
};

// Método estático para buscar por ruta e idioma
SeoSchema.statics.findByRouteAndLanguage = function (
  route: string,
  language: string
) {
  return this.findOne({
    route,
    status: 'active',
    'multiLanguageContent.language': language.toUpperCase(),
  });
};

export default model<ISeo>('Seo', SeoSchema);

// Interfaz para exportar
export { ISeo, ISeoContent };
