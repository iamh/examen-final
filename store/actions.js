import firebaseApp from '~/firebaseapp'
import { firebaseAction } from 'vuexfire'
import uuidv1 from 'uuid/v1'
import { camelize } from '~/utils/utils'

/**
 * Uploads individual file
 * @param file
 * @returns {firebase.Promise}
 * @private
 */
function _uploadImage (file) {
  let ref = firebaseApp
    .storage()
    .ref()
    .child('workouts')
  return ref
    .child(uuidv1())
    .child(file.name)
    .put(file)
    .then(snapshot => {
      return snapshot.downloadURL
    })
}

export default {
  _uploadImage,
  /**
   * Uploads images to the firebase datastore
   * @param state
   * @param files
   * @returns {Promise}
   */
  uploadImages ({ state }, files) {
    return Promise.all(files.map(_uploadImage)).catch(err => console.log('Error uploadImages ' + err))
  },
  /**
   * Creates new workout
   * @param commit
   * @param state
   * @param workout
   */
  createNewWorkout ({ commit, state }, workout) {
    if (!workout) {
      return
    }

    workout.username = state.user.displayName
    workout.uid = state.user.uid
    workout.date = Date.now()
    workout.rate = 0
    // Get a key for a new Workout.
    let newWorkoutKey = state.workoutsRef.push().key

    // Write the new post's data simultaneously in the posts list and the user's post list.
    let updates = {}
    updates['/workouts/' + newWorkoutKey] = workout
    updates['/user-workouts/' + state.user.uid + '/' + newWorkoutKey] = workout

    return firebaseApp
      .database()
      .ref()
      .update(updates)
  },

  /**
   * Sets the pomodoro timer
   * @param {object} store
   * @param {string} set
   * @param {number} value
   */
  setPomodoro ({ commit, state }, { set, value }) {
    if (!value) {
      return
    }
    value = parseFloat(value)
    if (state.configRef) {
      commit('setLoading', { [set]: true })
      state.configRef
        .update({ [camelize(set.replace('set', ''))]: value })
        .then(setTimeout(() => commit('setLoading', { [set]: false }), 2000))
    } else {
      commit('setPomodoro', set, value)
    }
  },

  /**
   * Updates the total pomodoro number
   * @param {object} store
   * @param {number} totalPomodoros
   */
  updateTotalPomodoros ({ state }, totalPomodoros) {
    state.statisticsRef.update({ totalPomodoros: totalPomodoros })
  },

  /**
   * Updates the total pomodoro number
   * @param {object} store
   * @param {number} totalPomodoros
   */
  saveWorkoutStats ({ state }, {workout, time}) {
    state.statisticsRef.child('workouts/' + workout['.key']).transaction(wk => {
      if (!wk) {
        wk = {
          count: 0,
          time: 0,
          exercises: []
        }
      }
      wk.count = wk.count + 1
      wk.time = wk.time + time
      wk.exercises.push(Date.now())
      return wk
    })
  },
  modifyWorkout ({state, commit}, {workout, pictures}) {
    if (!workout) {
      return
    }
    if (pictures.length > 0) {
      workout.pictures = pictures
    }

    workout.date = Date.now()
    workout = {...workout, key: workout['.key']}
    delete workout['.key']

    // Write the new post's data simultaneously in the posts list and the user's post list.
    let updates = {}
    updates['/workouts/' + workout.key] = workout
    updates['/user-workouts/' + state.user.uid + '/' + workout.key] = workout
    return firebaseApp
      .database()
      .ref()
      .update(updates)
  },
  deleteWorkout ({commit, state}, key) {
    let db = firebaseApp.database()
    let workout = db.ref('/workouts/')
    workout.child(key).remove()
    let userWorkout = db.ref('/user-workouts/' + state.user.uid)
    userWorkout.child(key).remove()
  },
  deletePicture ({commit, state}, {workoutKey, key}) {
    let db = firebaseApp.database()
    let workout = db.ref('/workouts/' + workoutKey + '/pictures')
    workout.child(key).remove()
    let userWorkout = db.ref('/user-workouts/' + state.user.uid + '/' + workoutKey + '/pictures')
    userWorkout.child(key).remove()
  },
  /**
   * Creates a new user with given email and password and stores it in the firebase database
   * @param {object} store
   * @param {object} email and password
   */
  createUser ({ commit }, { email, password }) {
    firebaseApp
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(() => {
        commit('setAuthError', '')
      })
      .catch(error => {
        commit('setAuthError', error.message)
      })
  },
  /**
   * Updates user display name
   * @param state
   * @param commit
   * @param {string} displayName
   */
  updateUserName ({ state, commit }, displayName) {
    state.user.updateProfile({
      displayName
    })
    commit('setDisplayName', displayName)
  },
  /**
   * Updates user's profile pic
   * @param state
   * @param {string} photoURL
   */
  updatePhotoURL ({ state }, photoURL) {
    state.user.updateProfile({
      photoURL
    })
  },
  /**
   * Updates user's email address
   * @param state
   * @param {string} email
   */
  updateUserEmail ({ state }, email) {
    state.user.updateEmail(email).then(
      () => {
        // Update successful.
      },
      error => {
        console.log(error)
      }
    )
  },
  /**
   * Authenticates a new user with given email and password
   * @param {object} store
   * @param {object} email and password
   */
  authenticate ({ state, commit }, { email, password }) {
    firebaseApp
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        commit('setAuthError', '')
      })
      .catch(err => {
        commit('setAuthError', err.message)
      })
  },
  /**
   * Resets authentication error
   * @param commit
   */
  resetAuthError ({ commit }) {
    commit('setAuthError', '')
  },
  /**
   * Authenticates anonymous user
   * @param {object} store
   */
  authenticateAnonymous ({ state }) {
    firebaseApp
      .auth()
      .signInAnonymously()
      .catch(error => {
        console.log(error.code, error.message)
      })
  },
  /**
   * Logouts the user from the application
   * @param {object} store
   */
  logout ({ state }) {
    firebaseApp.auth().signOut()
  },
  /**
   * Binds firebase auth listener to the auth changes to the callback that will set the store's user object
   * @param {object} store
   */
  bindAuth ({ commit, dispatch, state }) {
    firebaseApp.auth().onAuthStateChanged(user => {
      commit('setUser', user)
      if (user && !user.isAnonymous) {
        let displayName = user.displayName || user.email.split('@')[0]
        if (!user.displayName) {
          dispatch('updateUserName', displayName)
        }
        commit('setDisplayName', displayName)
        dispatch('bindFirebaseReferences', user)
      }
      if (!user) {
        dispatch('unbindFirebaseReferences')
        dispatch('bindWorkouts')
      }
    })
  },
  /**
   * Binds Workouts reference
   */
  bindWorkouts: firebaseAction(({ commit, dispatch }) => {
    let db = firebaseApp.database()
    let workoutsRef = db.ref('/workouts')
    dispatch('bindFirebaseReference', {
      reference: workoutsRef,
      toBind: 'workouts'
    }).then(() => {
      commit('setWorkoutsRef', workoutsRef)
    })
  }),
  /**
   * Binds firebase configuration and statistics database references to the store's corresponding objects
   * @param {object} store
   */
  bindFirebaseReferences: firebaseAction(
    ({ state, commit, dispatch }, user) => {
      let db = firebaseApp.database()
      let configRef = db.ref(`/configuration/${user.uid}`)
      let statisticsRef = db.ref(`/statistics/${user.uid}`)

      dispatch('bindFirebaseReference', {
        reference: configRef,
        toBind: 'config'
      }).then(() => {
        commit('setConfigRef', configRef)
      })
      dispatch('bindFirebaseReference', {
        reference: statisticsRef,
        toBind: 'statistics'
      }).then(() => {
        commit('setStatisticsRef', statisticsRef)
      })
    }
  ),
  /**
   * Generic binder of the firebase reference to the given key of the store's state
   * Checks if the value already exists in the database, otherwise will set it with the default store's state before binding
   * @param {object} store
   */
  bindFirebaseReference: firebaseAction(
    ({ bindFirebaseRef, state }, { reference, toBind }) => {
      return reference.once('value').then(snapshot => {
        if (!snapshot.val()) {
          reference.set(state[toBind])
        }
        bindFirebaseRef(toBind, reference)
      })
    }
  ),
  /**
   * Undbinds firebase references
   */
  unbindFirebaseReferences: firebaseAction(({ unbindFirebaseRef, commit }) => {
    commit('setConfigRef', null)
    commit('setStatisticsRef', null)
    commit('setWorkoutsRef', null)
    try {
      unbindFirebaseRef('config')
      unbindFirebaseRef('statistics')
      unbindFirebaseRef('workouts')
    } catch (error) {
      return
    }
  }),
  /**
   * Marks given todoItem as in progress
   * @param commit
   * @param todoId
   */
  markToDoAsInProgress ({ commit }, todoId) {
    commit('setInProgress', { id: todoId, value: true })
  },
  /**
   * Marks given todoItem as done
   * @param commit
   * @param todoId
   */
  markToDoAsDone ({ commit }, todoId) {
    commit('setInProgress', { id: todoId, value: false })
    commit('markAsDone', todoId)
  },
  setToDoPomodoros ({ commit }, { id, pomodoros }) {
    commit('setToDoPomodoros', { id, pomodoros })
  },
  setPomodorosWhenStarted ({ commit }, { id, pomodoros }) {
    commit('setPomorodosWhenStarted', { id, pomodoros })
  },
  addTodo ({ commit }, todo) {
    todo.id = uuidv1()
    todo.pomodoros = null
    commit('addTodo', todo)
  },
  clearDoneTodos ({ commit, getters }) {
    commit('clearToDos', getters.doneTodos)
  },
  setLoading ({ commit }, loading) {
    commit('setLoading', loading)
  },
  setMode ({commit}, mode) {
    commit('setMode', mode)
  },
  setWorkout ({commit}, key) {
    let db = firebaseApp.database()
    let workout = db.ref('workouts/' + key)
    workout.on('value', function (snapshot) {
      commit('setWorkout', snapshot.val())
    })
  }

}
