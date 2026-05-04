module.exports = (sequelize, DataTypes) => {
    const Module = sequelize.define('Module', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        preview_image: {
            type: DataTypes.STRING(500)
        },
        file_url: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        current_version: {
            type: DataTypes.STRING(50),
            allowNull: false
        }
    }, {
        tableName: 'Modules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    Module.associate = (db) => {
        Module.hasMany(db.License, { foreignKey: 'module_id', onDelete: 'CASCADE' });
        Module.hasMany(db.ModuleVersion, { foreignKey: 'module_id', onDelete: 'CASCADE' });
        Module.hasMany(db.ModuleGallery, { foreignKey: 'module_id', onDelete: 'CASCADE' });
        Module.hasMany(db.ModuleNews, { foreignKey: 'module_id', onDelete: 'CASCADE' });
    };

    return Module;
};