'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('ModuleVersions', [
            {
                module_id: 1,
                version: 'v1.0.0',
                file_url: 'https://example.com/files/premium-module-v1.0.0.zip',
                changelog: 'Первая версия модуля',
                created_at: new Date()
            },
            {
                module_id: 1,
                version: 'v1.1.0',
                file_url: 'https://example.com/files/premium-module-v1.1.0.zip',
                changelog: 'Добавлена новая функциональность',
                created_at: new Date()
            },
            {
                module_id: 2,
                version: 'v2.0.0',
                file_url: 'https://example.com/files/basic-module-v2.0.0.zip',
                changelog: 'Полный рефакторинг',
                created_at: new Date()
            },
            {
                module_id: 2,
                version: 'v2.1.0',
                file_url: 'https://example.com/files/basic-module-v2.1.0.zip',
                changelog: 'Исправлены баги',
                created_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('ModuleVersions', null, {});
    }
};