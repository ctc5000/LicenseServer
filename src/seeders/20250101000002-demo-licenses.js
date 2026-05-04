'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('Licenses', [
            {
                module_id: 1,
                license_key: 'DEMO-PREMIUM-12345-ABCDE',
                is_active: true,
                expires_at: null,
                created_at: new Date()
            },
            {
                module_id: 1,
                license_key: 'TEST-ACTIVE-67890-FGHIJ',
                is_active: true,
                expires_at: null,
                created_at: new Date()
            },
            {
                module_id: 2,
                license_key: 'BASIC-LICENSE-54321-ZYXWV',
                is_active: true,
                expires_at: null,
                created_at: new Date()
            },
            {
                module_id: 1,
                license_key: 'EXPIRED-LICENSE-99999-OLD00',
                is_active: false,
                expires_at: new Date('2024-01-01'),
                created_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('Licenses', null, {});
    }
};