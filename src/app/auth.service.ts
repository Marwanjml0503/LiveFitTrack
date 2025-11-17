import { Injectable, inject } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  user
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc,
  setDoc,
  getDoc,
  query, 
  orderBy 
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export interface User {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: Date;
}

export interface Workout {
  id: string;
  name: string;
  type: string;
  duration: number;
  notes?: string;
  date: Date | any;
}

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date | any;
  savedAt: Date | any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  user$ = user(this.auth);

  // Authentication Methods
  async register(email: string, password: string, username: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName: username });
      
      // Create user document in Firestore to store the username
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: email,
        username: username,
        displayName: username,
        createdAt: new Date()
      });
      
      console.log('User registered and document created with username:', username);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // User Data Methods
  async getUserData(userId: string): Promise<User | null> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: data['uid'],
          email: data['email'],
          username: data['username'],
          displayName: data['displayName'],
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : data['createdAt']
        } as User;
      } else {
        return null;
      }
    } catch (error: any) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, username: string): Promise<void> {
    try {
      // Update Firebase Auth profile
      if (this.auth.currentUser) {
        await updateProfile(this.auth.currentUser, { displayName: username });
      }
      
      // Update Firestore user document
      const userDocRef = doc(this.firestore, 'users', userId);
      await setDoc(userDocRef, {
        username: username,
        displayName: username
      }, { merge: true }); // Merge to update only these fields
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Workout Methods
  async loadWorkouts(userId: string): Promise<Workout[]> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const workoutsRef = collection(userDocRef, 'workouts');
      const q = query(workoutsRef, orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      const workouts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date']?.toDate ? data['date'].toDate() : data['date']
        } as Workout;
      });
      
      return workouts;
    } catch (error: any) {
      console.error('Error loading workouts:', error);
      throw error;
    }
  }

  async addWorkout(userId: string, workout: Omit<Workout, 'id'>): Promise<string> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const workoutsRef = collection(userDocRef, 'workouts');
      
      const docRef = await addDoc(workoutsRef, {
        ...workout,
        date: new Date()
      });
      
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding workout:', error);
      throw error;
    }
  }

  async deleteWorkout(userId: string, workoutId: string): Promise<void> {
    try {
      const workoutDocRef = doc(this.firestore, 'users', userId, 'workouts', workoutId);
      await deleteDoc(workoutDocRef);
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  }

  // Location Methods
  async loadLocations(userId: string): Promise<Location[]> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const locationsRef = collection(userDocRef, 'locations');
      const q = query(locationsRef, orderBy('savedAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      const locations = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : data['timestamp'],
          savedAt: data['savedAt']?.toDate ? data['savedAt'].toDate() : data['savedAt']
        } as Location;
      });
      
      return locations;
    } catch (error: any) {
      console.error('Error loading locations:', error);
      throw error;
    }
  }

  async saveLocation(userId: string, location: Omit<Location, 'id' | 'savedAt'>): Promise<string> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const locationsRef = collection(userDocRef, 'locations');
      
      const docRef = await addDoc(locationsRef, {
        ...location,
        savedAt: new Date()
      });
      
      return docRef.id;
    } catch (error: any) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  async deleteLocation(userId: string, locationId: string): Promise<void> {
    try {
      const locationDocRef = doc(this.firestore, 'users', userId, 'locations', locationId);
      await deleteDoc(locationDocRef);
    } catch (error: any) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }
}