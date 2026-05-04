module.exports = (sequelize, DataTypes) => {
    const ModuleGallery = sequelize.define('ModuleGallery', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        module_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'ModuleGallery',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    ModuleGallery.associate = (db) => {
        ModuleGallery.belongsTo(db.Module, { foreignKey: 'module_id' });
    };

    return ModuleGallery;
};