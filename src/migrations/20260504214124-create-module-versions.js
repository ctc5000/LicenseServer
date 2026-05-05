'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.tableExists('ModuleVersions');
        if (tableExists) return;

        await queryInterface.createTable('ModuleVersions', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            module_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Modules',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            version: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            file_url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            changelog: {
                type: Sequelize.TEXT
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        const indexes = await queryInterface.showIndex('ModuleVersions');
        const hasCompositeIndex = indexes.some(idx => idx.name === 'module_versions_module_id_version');

        if (!hasCompositeIndex) {
            await queryInterface.addIndex('ModuleVersions', ['module_id', 'version']);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('ModuleVersions');
    }
};