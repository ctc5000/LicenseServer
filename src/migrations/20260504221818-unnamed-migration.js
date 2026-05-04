'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Licenses', 'status', {
            type: Sequelize.STRING(50),
            defaultValue: 'active',
            allowNull: false
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Licenses', 'status');
    }
};