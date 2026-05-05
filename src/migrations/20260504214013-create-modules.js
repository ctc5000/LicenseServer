'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.tableExists('Modules');
        if (tableExists) return;

        await queryInterface.createTable('Modules', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            title: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT
            },
            preview_image: {
                type: Sequelize.STRING(500)
            },
            file_url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            current_version: {
                type: Sequelize.STRING(50),
                allowNull: false
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
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Modules');
    }
};