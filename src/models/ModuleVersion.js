module.exports = (sequelize, DataTypes) => {
    const ModuleVersion = sequelize.define('ModuleVersion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        module_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        version: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        file_url: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        changelog: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'ModuleVersions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    ModuleVersion.associate = (db) => {
        ModuleVersion.belongsTo(db.Module, { foreignKey: 'module_id' });
    };

    return ModuleVersion;
};