import Component from 'ember-component';
import { task } from 'ember-concurrency';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import computed from 'ember-computed';
import service from 'ember-service/inject';

const QuickUpdateItemComponent = Component.extend({
  i18n: service(),

  isCompleted: computed('entry.progress', {
    get() {
      return get(this, 'entry.status') === 'completed';
    }
  }).readOnly(),

  nextProgress: computed('entry.progress', {
    get() {
      return get(this, 'entry.progress') + 1;
    }
  }).readOnly(),

  canComplete: computed('nextProgress', {
    get() {
      return get(this, 'nextProgress') === get(this, 'entry.media.episodeCount');
    }
  }).readOnly(),

  episodeText: computed('nextProgress', {
    get() {
      const num = get(this, 'nextProgress');
      const start = get(this, 'i18n').t('dashboard.quickUpdate.episode', { num });
      // TODO: If we have the episode data, then append the `- Episode Title`.
      return start;
    }
  }).readOnly(),

  updateEntryTask: task(function* () {
    const entry = get(this, 'entry');
    const progress = get(entry, 'progress');

    if (get(this, 'canComplete') === true) {
      set(entry, 'status', 'completed');
    }
    set(entry, 'progress', progress + 1);
    // TODO: Feedback on error
    yield entry.save().catch(() => {});
  }).drop(),

  actions: {
    rateEntry(rating) {
      const entry = get(this, 'entry');
      set(entry, 'rating', rating);
      // TODO: Feedback on error
      entry.save().catch(() => {});
    }
  }
});

QuickUpdateItemComponent.reopenClass({
  positionalParams: ['entry']
});

export default QuickUpdateItemComponent;
