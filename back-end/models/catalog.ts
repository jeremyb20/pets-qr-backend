// const { Schema, model } = require('mongoose');

// const catalogSchema = new Schema({
//     idOwner: {
//         type: String,
//         require: false
//     },
//     code: {
//         type: String,
//         require: false
//     },
//     productName: {
//         type: String,
//         require: false
//     },
//     description: {
//         type: String,
//         require: false
//     },
//     metaDescription:{
//         type: String,
//         require: false
//     },
//     price: {
//         type: String,
//         require: false
//     },
//     quantity: {
//         type: String,
//         require: false
//     },
//     inventoryStatus: {
//         type: String,
//         require: false
//     },
//     category: {
//         type: String,
//         require: false
//     },
//     country: {
//         type: String,
//         require: false
//     },
//     phone: {
//         type: String,
//         require: false
//     },
//     images: [{
//         imageURL: { type: String, required: false },
//         image_id: { type: String, required: false },
//     }],
//     rating: {
//         type: String,
//         require: false
//     }
// },
//     {
//         timestamps: true,
//         versionKey: false
//     }
// )

// module.exports = model("Catalog", catalogSchema);
import { Schema, model, Document, Types } from 'mongoose';

// Interface para las imágenes del catálogo
export interface ICatalogImage {
  imageURL: string;
  image_id: string;
  _id?: Types.ObjectId;
}

// Interface principal del documento Catalog
export interface ICatalog extends Document {
  idOwner: string;
  code: string;
  productName: string;
  description: string;
  metaDescription: string;
  price: string;
  quantity: string;
  inventoryStatus: string;
  category: string;
  country: string;
  phone: string;
  images: ICatalogImage[];
  rating: string;
  createdAt: Date;
  updatedAt: Date;
}

const catalogSchema = new Schema<ICatalog>(
  {
    idOwner: {
      type: String,
      required: false,
    },
    code: {
      type: String,
      required: false,
    },
    productName: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    metaDescription: {
      type: String,
      required: false,
    },
    price: {
      type: String,
      required: false,
    },
    quantity: {
      type: String,
      required: false,
    },
    inventoryStatus: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    images: [
      {
        imageURL: { type: String, required: false },
        image_id: { type: String, required: false },
      },
    ],
    rating: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model<ICatalog>('Catalog', catalogSchema);
