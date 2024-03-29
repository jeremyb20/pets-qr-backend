const { Schema, model } = require('mongoose');

const catalogSchema = new Schema({
    idOwner: {
        type: String,
        require: false
    },
    code: {
        type: String,
        require: false
    },
    productName: {
        type: String,
        require: false
    },
    description: {
        type: String,
        require: false
    },
    metaDescription:{
        type: String,
        require: false
    },
    price: {
        type: String,
        require: false
    },
    quantity: {
        type: String,
        require: false
    },
    inventoryStatus: {
        type: String,
        require: false
    },
    category: {
        type: String,
        require: false
    },
    country: {
        type: String,
        require: false
    },
    phone: {
        type: String,
        require: false
    },
    images: [{
        imageURL: { type: String, required: false },
        image_id: { type: String, required: false },
    }],
    rating: {
        type: String,
        require: false
    }
},
    {
        timestamps: true,
        versionKey: false
    }
)

module.exports = model("Catalog", catalogSchema);
