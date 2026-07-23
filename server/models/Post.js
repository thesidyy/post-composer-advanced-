import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Post extends Model {}

Post.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  text: {
    type: DataTypes.STRING(600),
    defaultValue: '',
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  gif: {
    type: DataTypes.JSON,
    defaultValue: null,
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  liked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  bookmarked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  sequelize,
  modelName: 'Post',
  tableName: 'posts',
  timestamps: true,
});

Post.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  
  values.id = values.id.toString();
  values.ts = new Date(values.createdAt).getTime();
  
  // Sometimes SQLite Sequelize returns JSON as string, we can ensure it's parsed
  if (typeof values.tags === 'string') {
    try { values.tags = JSON.parse(values.tags); } catch (e) {}
  }
  if (typeof values.images === 'string') {
    try { values.images = JSON.parse(values.images); } catch (e) {}
  }
  if (typeof values.gif === 'string') {
    try { values.gif = JSON.parse(values.gif); } catch (e) {}
  }
  
  return values;
};

export default Post;
