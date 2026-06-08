import { useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function TestFirebase() {
  useEffect(() => {
    async function test() {
      const snapshot = await getDocs(collection(db, "properties"));

      console.log("Documents Found:", snapshot.docs.length);

      snapshot.docs.forEach((doc) => {
        console.log(doc.id, doc.data());
      });
    }

    test();
  }, []);

  return <div>Firebase Connected ✅</div>;
}
