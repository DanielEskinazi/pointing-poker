import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store";
import { LoadingButton } from "./loading";
import { useToast } from "./toast";

export const RevealButton = () => {
  const [isRevealingLocal, setIsRevealingLocal] = useState(false);

  const { isRevealing, revealVotes, isCurrentUserHost, getVoteProgress } =
    useGameStore();

  const { showToast } = useToast();
  const { votedCount, totalCount } = getVoteProgress();
  const canReveal = votedCount > 0 && !isRevealing && isCurrentUserHost();

  const handleRevealCards = async () => {
    if (!canReveal || isRevealingLocal) return;

    setIsRevealingLocal(true);
    try {
      await revealVotes();
      showToast("Cards revealed!", "info");
    } catch (error) {
      console.error("Error revealing votes:", error);
      showToast("Failed to reveal cards", "error", {
        message: "Please try again",
        action: {
          label: "Retry",
          onClick: handleRevealCards,
        },
      });
    } finally {
      setIsRevealingLocal(false);
    }
  };

  if (!canReveal) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-6 flex justify-center"
    >
      <LoadingButton
        onClick={handleRevealCards}
        disabled={!canReveal}
        isLoading={isRevealingLocal}
        loadingText="Revealing..."
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        variant="primary"
      >
        Reveal Cards ({votedCount}/{totalCount})
      </LoadingButton>
    </motion.div>
  );
};
