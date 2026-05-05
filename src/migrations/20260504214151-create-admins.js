'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.tableExists('Admins');
        if (tableExists) return;

        await queryInterface.createTable('Admins', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            username: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true
            },
            password_hash: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Admins');
    }
};