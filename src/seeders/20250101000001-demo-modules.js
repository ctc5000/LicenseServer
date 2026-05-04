'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('Modules', [
            {
                title: 'Premium Module',
                description: 'Это демонстрационный модуль для тестирования',
                preview_image: 'https://via.placeholder.com/300x200.png?text=Module+Preview',
                file_url: 'https://example.com/files/premium-module-v1.0.0.zip',
                current_version: 'v1.0.0',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                title: 'Basic Module',
                description: 'Базовый модуль с ограниченным функционалом',
                preview_image: 'https://via.placeholder.com/300x200.png?text=Basic+Module',
                file_url: 'https://example.com/files/basic-module-v2.1.0.zip',
                current_version: 'v2.1.0',
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('Modules', null, {});
    }
};