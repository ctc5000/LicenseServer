module.exports = (sequelize, DataTypes) => {
    const ModuleNews = sequelize.define('ModuleNews', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        module_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Modules',
                key: 'id'
            }
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        published_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'ModuleNews',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    ModuleNews.associate = (db) => {
        ModuleNews.belongsTo(db.Module, { foreignKey: 'module_id' });
    };

    return ModuleNews;
};