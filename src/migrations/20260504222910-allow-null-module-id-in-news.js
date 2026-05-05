'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('ModuleNews');
        if (!tableInfo.module_id || tableInfo.module_id.allowNull === true) return;

        await queryInterface.changeColumn('ModuleNews', 'module_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('ModuleNews', 'module_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });
    }
};