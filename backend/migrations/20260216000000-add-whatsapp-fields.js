'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add phoneNumber to Users table
    await queryInterface.addColumn('Users', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    await queryInterface.addColumn('Users', 'platform', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'web'
    });
    
    await queryInterface.addColumn('Users', 'externalId', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    // Create Messages table for WhatsApp
    await queryInterface.createTable('Messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'whatsapp'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      direction: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'incoming' // incoming or outgoing
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    
    // Add indexes
    await queryInterface.addIndex('Messages', ['phoneNumber']);
    await queryInterface.addIndex('Messages', ['userId']);
    await queryInterface.addIndex('Messages', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Messages');
    
    await queryInterface.removeColumn('Users', 'phoneNumber');
    await queryInterface.removeColumn('Users', 'platform');
    await queryInterface.removeColumn('Users', 'externalId');
  }
};
