'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.tableExists('Licenses');
        if (tableExists) return;

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

        const indexes = await queryInterface.showIndex('Licenses');
        const hasLicenseKeyIndex = indexes.some(idx => idx.name === 'licenses_license_key');
        const hasModuleIdIndex = indexes.some(idx => idx.name === 'licenses_module_id');

        if (!hasLicenseKeyIndex) {
            await queryInterface.addIndex('Licenses', ['license_key']);
        }
        if (!hasModuleIdIndex) {
            await queryInterface.addIndex('Licenses', ['module_id']);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Licenses');
    }
};