'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.tableExists('ModuleNews');
        if (tableExists) return;

        await queryInterface.createTable('ModuleNews', {
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
            title: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            published_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        const indexes = await queryInterface.showIndex('ModuleNews');
        const hasCompositeIndex = indexes.some(idx => idx.name === 'module_news_module_id_published_at');

        if (!hasCompositeIndex) {
            await queryInterface.addIndex('ModuleNews', ['module_id', 'published_at']);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('ModuleNews');
    }
};