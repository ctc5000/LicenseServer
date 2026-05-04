'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Licenses', {
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
            license_key: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            expires_at: {
                type: Sequelize.DATEONLY
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        await queryInterface.addIndex('Licenses', ['license_key']);
        await queryInterface.addIndex('Licenses', ['module_id']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Licenses');
    }
};