module.exports = (sequelize, DataTypes) => {
    const License = sequelize.define('License', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        module_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Modules',
                key: 'id'
            }
        },
        license_key: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'active',
            allowNull: false
        },
        expires_at: {
            type: DataTypes.DATEONLY
        }
    }, {
        tableName: 'Licenses',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false  // Отключаем updated_at
    });

    License.associate = (db) => {
        License.belongsTo(db.Module, { foreignKey: 'module_id' });
    };

    return License;
};