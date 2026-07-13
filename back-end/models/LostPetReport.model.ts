// models/LostPetReport.model.ts

import { Schema, model, Types } from 'mongoose';
import { ILostPetReport } from '../interfaces/IlostPetReport';

// Schema para avistamientos
const SightingSchema = new Schema({
  reporter: {
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: false },
    isAnonymous: { type: Boolean, default: false },
  },
  location: {
    address: { type: String, required: true },
    lat: { type: String, required: true },
    lng: { type: String, required: true },
    placeId: { type: String, required: false },
  },
  sightingDate: { type: String, required: true },
  description: { type: String, required: true },
  photo: { type: String, required: false },
  petCondition: {
    status: {
      type: String,
      enum: ['healthy', 'injured', 'sick', 'deceased'],
      default: 'healthy',
    },
    description: { type: String, required: false },
  },
  contactMade: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// Schema principal
const LostPetReportSchema = new Schema<ILostPetReport>(
  {
    // Mascota registrada (opcional)
    registeredPet: {
      petId: { type: Schema.Types.ObjectId, ref: 'Pet' },
      isLinked: { type: Boolean, default: false },
      linkedAt: { type: Date },
      linkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // Información de la mascota
    petInfo: {
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ['dog', 'cat', 'other'],
        required: true,
      },
      breed: { type: String },
      color: { type: String },
      size: { type: String, enum: ['small', 'medium', 'large'] },
      gender: { type: String, enum: ['male', 'female'] },
      age: { type: String },
      distinctiveFeatures: { type: String },
      collarInfo: { type: String },
      microchip: {
        number: { type: String },
        company: { type: String },
      },
      photo: { type: String },
      photo_id: { type: String },
    },

    // Información del reportante
    reporter: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
      isAnonymous: { type: Boolean, default: false },
      ipAddress: { type: String },
    },

    // Contacto del dueño (si es diferente)
    ownerContact: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      alternativePhone: { type: String },
    },

    // Detalles de pérdida
    lostDetails: {
      date: { type: String, required: true },
      time: { type: String },
      lastSeenLocation: {
        address: { type: String, required: true },
        lat: { type: String, required: true },
        lng: { type: String, required: true },
        placeId: { type: String },
      },
      circumstances: { type: String },
      wasWearingCollar: { type: Boolean },
      hasMicrochip: { type: Boolean },
      isNeutered: { type: Boolean },
    },

    // Recompensa
    reward: {
      isOffered: { type: Boolean, default: false },
      amount: { type: Number },
      description: { type: String },
    },

    // Estado
    status: {
      value: {
        type: String,
        enum: ['active', 'pending', 'resolved', 'expired', 'cancelled'],
        default: 'active',
      },
      updatedAt: { type: Date, default: Date.now },
      reason: { type: String },
    },

    // Avistamientos
    sightings: [SightingSchema],

    // Estadísticas
    stats: {
      viewsCount: { type: Number, default: 0 },
      sightingsCount: { type: Number, default: 0 },
      unreadSightings: { type: Number, default: 0 },
      sharesCount: { type: Number, default: 0 },
      lastActivityAt: { type: Date, default: Date.now },
    },

    // Links públicos
    publicLinks: {
      shareableLink: { type: String, required: true, unique: true },
      qrCode: { type: String },
      expiresAt: { type: Date },
    },

    // Expiración
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },

    // Metadatos
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      source: {
        type: String,
        enum: ['web', 'mobile', 'whatsapp', 'facebook', 'other'],
        default: 'web',
      },
      language: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Índices
LostPetReportSchema.index({ 'publicLinks.shareableLink': 1 });
LostPetReportSchema.index({ 'status.value': 1 });
LostPetReportSchema.index({ 'registeredPet.petId': 1 });
LostPetReportSchema.index({ 'reporter.userId': 1 });
LostPetReportSchema.index({
  'lostDetails.lastSeenLocation.coordinates': '2dsphere',
});
LostPetReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Métodos estáticos
LostPetReportSchema.statics.findByShareableLink = function (link: string) {
  return this.findOne({ 'publicLinks.shareableLink': link });
};

LostPetReportSchema.statics.findActive = function () {
  return this.find({
    'status.value': 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

LostPetReportSchema.statics.findNearby = function (
  lat: number,
  lng: number,
  radiusKm: number = 10
) {
  // Implementar búsqueda geoespacial
  return this.find({
    'status.value': 'active',
    'lostDetails.lastSeenLocation.lat': { $exists: true },
  });
};

// Métodos de instancia
LostPetReportSchema.methods.addSighting = function (sightingData: any) {
  this.sightings.push(sightingData);
  this.stats.sightingsCount += 1;
  this.stats.unreadSightings += 1;
  this.stats.lastActivityAt = new Date();
  return this.save();
};

LostPetReportSchema.methods.markSightingsAsRead = function () {
  this.stats.unreadSightings = 0;
  return this.save();
};

LostPetReportSchema.methods.linkToRegisteredPet = async function (
  petId: Types.ObjectId,
  userId: Types.ObjectId
) {
  const Pet = model('Pet');
  const pet = await Pet.findById(petId);

  if (!pet) {
    throw new Error('Pet not found');
  }

  this.registeredPet = {
    petId,
    isLinked: true,
    linkedAt: new Date(),
    linkedBy: userId,
  };

  // Actualizar el estatus de la mascota original
  pet.petStatus = 'lost';
  await pet.save();

  return this.save();
};

LostPetReportSchema.methods.resolve = function (reason: string) {
  this.status.value = 'resolved';
  this.status.updatedAt = new Date();
  this.status.reason = reason;

  // Si estaba vinculada a una mascota registrada, actualizar su estado
  if (this.registeredPet?.isLinked) {
    const Pet = model('Pet');
    Pet.findByIdAndUpdate(this.registeredPet.petId, {
      petStatus: 'active',
    }).exec();
  }

  return this.save();
};

// Middleware pre-save para generar link único
LostPetReportSchema.pre('save', async function () {
  if (!this.publicLinks.shareableLink) {
    const crypto = await import('crypto');
    const uniqueId = crypto.randomBytes(16).toString('hex');
    this.publicLinks.shareableLink = `/lost-pet/${uniqueId}`;
  }
});

export default model<ILostPetReport>('LostPetReport', LostPetReportSchema);
