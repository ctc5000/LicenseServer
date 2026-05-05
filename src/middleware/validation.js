const Joi = require('joi');

const validateLicenseCheck = (req, res, next) => {
    const schema = Joi.object({
        license: Joi.string().required(),
        version: Joi.string()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const validateModule = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().min(1).max(255).required(),
        description: Joi.string().allow('', null),
        preview_image: Joi.string().uri().allow('', null),
        file_url: Joi.string().uri().required(),
        current_version: Joi.string().required() // Убрали паттерн
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const validateLicense = (req, res, next) => {
    const schema = Joi.object({
        module_id: Joi.number().integer().positive().required(),
        license_key: Joi.string().min(1).max(255).required(),
        is_active: Joi.boolean(),
        status: Joi.string().valid('active', 'inactive', 'pending', 'expired', 'rejected').optional(),
        expires_at: Joi.date().allow(null)
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};
const validateVersion = (req, res, next) => {
    const schema = Joi.object({
        version: Joi.string().required(), // Убрали паттерн
        file_url: Joi.string().uri().required(),
        changelog: Joi.string().allow('', null)
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const validateNews = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().min(1).max(255).required(),
        content: Joi.string().min(1).required(),
        published_at: Joi.date(),
        image_url: Joi.string().uri().allow('', null).optional(),  // Добавить!
        module_id: Joi.number().allow(null).optional()  // Добавить!
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

module.exports = {
    validateLicenseCheck,
    validateModule,
    validateLicense,
    validateVersion,
    validateNews
};