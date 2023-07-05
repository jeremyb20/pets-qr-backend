const { Schema, model } = require('mongoose');

const catalogSchema = new Schema({
    
    productName: {
        type: String,
        require: true
    },
    size: {
        type: String,
        require: true
    },
    color: {
        type: String,
        require: true
    },
    description: {
        type: String,
        require: true
    },
    cost: {
        type: String,
        require: true
    },
    quantity: {
        type: String,
        require: true
    },
    firstPhoto: {
        type: String,
        require: true
    },
    secondPhoto: {
        type: String,
        require: true
    },
    images:[{
        imageURL: { type: String, required: true },
        imageID: { type: String, required: true },
    }]
    },
    {
        timestamps: true,
        versionKey: false
    }
)

module.exports = model("Catalog", catalogSchema);
