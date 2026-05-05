'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.tableExists('ModuleGallery');
        if (tableExists) return;

        await queryInterface.createTable('ModuleGallery', {
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
            image_url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            sort_order: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        const indexes = await queryInterface.showIndex('ModuleGallery');
        const hasCompositeIndex = indexes.some(idx => idx.name === 'module_gallery_module_id_sort_order');

        if (!hasCompositeIndex) {
            await queryInterface.addIndex('ModuleGallery', ['module_id', 'sort_order']);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('ModuleGallery');
    }
};