'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('ModuleNews', 'image_url', {
            type: Sequelize.STRING(500),
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('ModuleNews', 'image_url');
    }
};