import Component from 'ember-component';
import { task } from 'ember-concurrency';
import get, { getProperties } from 'ember-metal/get';
import set from 'ember-metal/set';
import service from 'ember-service/inject';
import { isEmpty } from 'ember-utils';

export default Component.extend({
  readOnly: false,
  session: service(),
  store: service(),

  getFeedData: task(function* (type, id) {
    // TODO: Remove ridiculous include when API links work
    return yield get(this, 'store').query('feed', {
      type,
      id,
      include: 'media,actor,unit,subject.user,subject.target_user,subject.post_likes.user,subject.comments.user,subject.media'
    });
  }).restartable(),

  createPost: task(function* (content) {
    const data = {
      content,
      user: get(this, 'session.account')
    };
    // posting on another profile?
    if (get(this, 'streamId') !== get(this, 'session.account.id')) {
      data.targetUser = get(this, 'store').peekRecord('user', get(this, 'streamId'));
    }
    const post = get(this, 'store').createRecord('post', data);
    const [group, activity] = this._createTempActivity(post);
    yield post.save().then((record) => {
      set(activity, 'foreignId', `Post:${get(record, 'id')}`);
    }).catch(() => {
      get(this, 'feed').removeObject(group);
    });
  }).drop(),

  /**
   * Create a temporary activity group record so that we can push a new
   * post into the feed without a restart.
   *
   * TODO:
   * When we enable real-time updates, we'll need to grab all groups that
   * don't have a set id, match the content from the real-time update and
   * fill in the missing details.
   */
  _createTempActivity(record) {
    const activity = get(this, 'store').createRecord('activity', {
      subject: record,
      foreignId: 'Post:<unknown>'
    });
    const group = get(this, 'store').createRecord('activity-group', {
      activities: [activity]
    });
    const feed = get(this, 'feed').toArray();
    feed.insertAt(0, group);
    set(this, 'feed', feed);
    return [group, activity];
  },

  didReceiveAttrs() {
    this._super(...arguments);
    const { streamType, streamId } = getProperties(this, 'streamType', 'streamId');
    if (isEmpty(streamType) || isEmpty(streamId)) {
      return;
    }
    get(this, 'getFeedData').perform(streamType, streamId)
      .then(data => set(this, 'feed', data));
  }
});
