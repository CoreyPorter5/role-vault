"use client";

import {useEffect} from "react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function LandingMotion() {
    useEffect(() => {
        const root = document.documentElement;
        const revealElements = Array.from(
            document.querySelectorAll<HTMLElement>("[data-reveal]"),
        );
        const heroJourney = document.querySelector<HTMLElement>("[data-hero-journey]");
        const workflowJourney = document.querySelector<HTMLElement>("[data-workflow-journey]");
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reducedMotion) {
            revealElements.forEach((element) => {
                element.dataset.revealed = "true";
            });
            heroJourney?.style.setProperty("--hero-scroll", "0");
            workflowJourney?.style.setProperty("--workflow-progress", "1");
            if (workflowJourney) workflowJourney.dataset.workflowActive = "2";
            return;
        }

        root.classList.add("marketing-motion-ready");

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const element = entry.target as HTMLElement;
                    element.dataset.revealed = "true";
                    observer.unobserve(element);
                });
            },
            {rootMargin: "0px 0px -10% 0px", threshold: 0.12},
        );

        revealElements.forEach((element) => observer.observe(element));

        let animationFrame = 0;
        const updateJourney = () => {
            animationFrame = 0;

            revealElements.forEach((element) => {
                if (element.dataset.revealed === "true") return;
                if (element.getBoundingClientRect().top > window.innerHeight * 0.9) return;
                element.dataset.revealed = "true";
                observer.unobserve(element);
            });

            if (heroJourney) {
                const heroRect = heroJourney.getBoundingClientRect();
                const heroProgress = clamp(-heroRect.top / Math.max(1, heroRect.height * 0.72));
                heroJourney.style.setProperty("--hero-scroll", heroProgress.toFixed(3));
            }

            if (workflowJourney) {
                const workflowRect = workflowJourney.getBoundingClientRect();
                const journeyStart = window.innerHeight * 0.78;
                const journeyDistance = journeyStart + workflowRect.height * 0.25;
                const workflowProgress = clamp(
                    (journeyStart - workflowRect.top) / Math.max(1, journeyDistance),
                );
                workflowJourney.style.setProperty(
                    "--workflow-progress",
                    workflowProgress.toFixed(3),
                );
                let activeStep = 0;
                if (workflowProgress >= 0.76) activeStep = 2;
                else if (workflowProgress >= 0.34) activeStep = 1;
                workflowJourney.dataset.workflowActive = String(activeStep);
            }
        };

        const requestJourneyUpdate = () => {
            if (animationFrame) return;
            animationFrame = window.requestAnimationFrame(updateJourney);
        };

        updateJourney();
        window.addEventListener("scroll", requestJourneyUpdate, {passive: true});
        window.addEventListener("resize", requestJourneyUpdate, {passive: true});

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", requestJourneyUpdate);
            window.removeEventListener("resize", requestJourneyUpdate);
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            root.classList.remove("marketing-motion-ready");
        };
    }, []);

    return null;
}
