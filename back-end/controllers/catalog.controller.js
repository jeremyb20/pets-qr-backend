const catalogCtl = {}
const fs = require('fs-extra');

const Catalog = require('../models/catalog');
const cloudinary = require('cloudinary').v2;
catalogCtl.getAllInventoryList = async (_req, res) => {
    const catalog = await Catalog.find();
    if (catalog.length == 0) {
        res.json({ success: false, message: 'No hay lista de catálogos disponibles' });
    } else {
        res.json({ payload: catalog, success: true });
    }
}

catalogCtl.createCatalog = async (req, res, next) => {
    const {code, productName, description, price, quantity, inventoryStatus, category, rating, idOwner } = req.body;
    try {
        const result = await cloudinary.uploader.upload((req.file != undefined) ? req.file.path : req.body.image, { folder: "catalog" });

        const dataImage = {
            image_id: result.public_id,
            imageURL: result.secure_url
        }

        const catalog = new Catalog({
            code, productName, description, price, quantity, inventoryStatus, category, rating, idOwner, images: dataImage,
        });
        await catalog.save();
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

catalogCtl.getCatalogById = async (req, res) => {
    try {
        const catalogInfo = await Catalog.findById(req.query.id);
        if (catalogInfo) {
            res.send({ success: true, payload: catalogInfo });
        } else {
            res.send({ success: false, payload: [], mesaje: 'Product not available' });
        }   
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}
catalogCtl.editCatalog = async (req, res) => {
    try {
        await Catalog.findByIdAndUpdate(req.body._id, req.body);
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

catalogCtl.deleteCatalog = async (req, res) => {
    try {
        const photo = await Catalog.findByIdAndDelete(req.query.id);
        if(photo.image_id){
            await cloudinary.uploader.destroy(photo.image_id);
        }
        res.send({msg: 'The information was updated correctly', success: true});  
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

catalogCtl.addCatalogImages = async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload((req.file != undefined) ? req.file.path : req.body.image, { folder: "catalog" });

        const dataImage = {
            image_id: result.public_id,
            imageURL: result.secure_url
        }
        await fs.unlink(req.file.path);
        await Catalog.findOneAndUpdate({ _id: req.body._id }, { $push: { images: dataImage } });
        res.send({msg: 'The information was updated correctly', success: true}); 
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

catalogCtl.deleteImageCatalog = async (req, res) => {
    try {
        await Catalog.findOneAndUpdate(
            { _id: req.body._id },
            { $pull: { images: { _id: req.body.image_id } } },
            { safe: true, multi: false }
        );

        await cloudinary.uploader.destroy(req.body.image_id);
        res.send({msg: 'The information was updated correctly', success: true}); 

    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

module.exports = catalogCtl;
