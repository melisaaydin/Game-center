const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./db');

const Lobbie = sequelize.define('Lobby', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    is_event: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    start_time: {
        type: DataTypes.DATE
    },
    end_time: {
        type: DataTypes.DATE
    },
    password: {
        type: DataTypes.STRING
    },
    game_type: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'lobbies',
    timestamps: false
});

module.exports = { Lobbie };