'use strict';

const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await queryInterface.bulkInsert('Admins', [
            {
                username: 'admin',
                password_hash: hashedPassword,
                created_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('Admins', { username: 'admin' }, {});
    }
};