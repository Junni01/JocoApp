import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import {
  CrisisType,
  DeployType,
  Elephant,
  EventCard,
  EventType,
  Presidency,
  Rebellion,
  Region,
  RegionName,
  RegionStatus,
  Scenario,
} from "./Types";
import { getElephantInitialPosition, getRegionData } from "./Data";
import { useContext, useState } from "react";
import { DeployDialog } from "./Deploy/DeployDialog";
import { ModifyRegionDialog } from "./ModifyRegionDialog";
import {
  calculateEmpireStrength,
  doesLossOfRegionCauseEmpireShatter,
  getCrisisType,
  marchElephant,
  shuffleEventPile,
} from "./Helpers";
import { ShuffleEvent } from "./EventDialogs/ShuffleEvent";
import { WindfallEvent } from "./EventDialogs/WindfallEvent";
import { TurmoilEvent } from "./EventDialogs/TurmoilEvent";
import { LeaderEvent } from "./EventDialogs/LeaderEvent";
import { PeaceEvent } from "./EventDialogs/PeaceEvent";
import { CrisisEvent } from "./EventDialogs/CrisisEvent";
import { RegionCard } from "./RegionCard";
import { ElephantCard } from "./ElephantCard";
import { GlobalEffectsDialog } from "./GlobalEffectsDialog";
import { GlobalEffectsContext } from "./GlobalEffectsContext";
import { ForeignInvasionEvent } from "./EventDialogs/ForeignInvasionEvent";
import { EventStack } from "./EventStack";
import { EventsInIndiaDialog } from "./EventsInIndiaDialog";

export const IndiaMap = (props: {
  scenario: Scenario;
  initialEventDeck: EventCard[];
}) => {
  const globalEffectsContext = useContext(GlobalEffectsContext);
  const regions = globalEffectsContext.regions;
  const elephant = globalEffectsContext.elephant;
  const eventDeck = globalEffectsContext.eventDeck;
  const drawStackRegion = globalEffectsContext.drawStackRegion;
  const setRegions = globalEffectsContext.setRegions;
  const setElephant = globalEffectsContext.setElephant;
  const activeEvent = globalEffectsContext.activeEvent;
  const executeElephantsMarch = globalEffectsContext.executeElephantsMarch;
  const discardEvent = globalEffectsContext.discardEvent;

  const [showGlobalEffectsDialog, setShowGlobalEffectsDialog] =
    useState<boolean>(false);

  const [deployRegion, setDeployRegion] = useState<Region | undefined>();
  const [showIndiaEventsDialog, setShowIndiaEventsDialog] =
    useState<boolean>(false);

  console.log(eventDeck);

  const handleDeployDialogOk = () => {
    setDeployRegion(undefined);
  };

  const executeCrisisEvent = (
    mainCrisisWon: boolean,
    rebellions: Rebellion[]
  ) => {
    const crisisType = getCrisisType(elephant, regions);

    switch (crisisType) {
      case CrisisType.SovereignInvadesSovereign:
        executeSovereignInvadesSovereign();
        break;
      case CrisisType.SovereignInvadesDominated:
        executeSovereignInvadesDominated();
        break;
      case CrisisType.SovereignInvadesEmpireCapital:
        executeSovereignInvadesEmpireCapital();
        break;
      case CrisisType.EmpireInvadesSovereign:
        executeEmpireInvadesSovereign();
        break;
      case CrisisType.DominatedRebelsAgainstEmpire:
        executeDominatedRebelsAgainstEmpire();
        break;
      case CrisisType.SovereignInvadesCompany:
        executeSovereignInvadesCompany(mainCrisisWon, rebellions);
        break;
      case CrisisType.EmpireInvadesCompany:
        executeEmpireInvadesCompany(mainCrisisWon, rebellions);
        break;
      case CrisisType.CompanyControlledRebels:
        executeCompanyControlledRebels(rebellions);
        break;
      case CrisisType.EmpireInvadesDominated:
        executeEmpireInvadesDominated();
        break;
      case CrisisType.EmpireCapitalInvadesEmpireCapital:
        executeEmpireCapitalInvadesEmpireCapital();
        break;
      default:
        console.error(
          "Crisis Type Switch Case Default: This should not happen"
        );
    }
    discardEvent();
  };

  const executeSovereignInvadesSovereign = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const newRegions = regions.filter(
      (r) => r.id != attacker.id && r.id != defender.id
    );

    const attackStrength = attacker.towerLevel + (activeEvent?.strength ?? 0);
    const defenseStrength = defender.towerLevel;
    const actionSuccessful = attackStrength > defenseStrength;
    if (actionSuccessful) {
      attacker.status = RegionStatus.EmpireCapital;
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;
    } else {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    }

    setRegions([...newRegions, attacker, defender]);

    if (actionSuccessful) {
      executeElephantsMarch(true);
    } else {
      executeElephantsMarch(false);
    }
  };

  const executeSovereignInvadesDominated = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const defenderDominator = regions.find((r) => r.id === defender.dominator);

    if (!defenderDominator) {
      console.error("EventDialog: Attacked of defender dominator not found!");
      return;
    }
    const newRegions = regions.filter(
      (r) =>
        r.id !== attacker.id &&
        r.id !== defender.id &&
        r.id !== defenderDominator.id
    );

    const attackStrength = attacker.towerLevel + (activeEvent?.strength ?? 0);
    const defenseStrength = calculateEmpireStrength(defender.id, regions) ?? 0;
    const actionSuccessful = attackStrength > defenseStrength;

    if (actionSuccessful) {
      if (doesLossOfRegionCauseEmpireShatter(defender, regions)) {
        defenderDominator.status = RegionStatus.Sovereign;
      }
      attacker.status = RegionStatus.EmpireCapital;
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;
    } else {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    }
    setRegions([...newRegions, attacker, defender, defenderDominator]);

    if (actionSuccessful) {
      executeElephantsMarch(true);
    } else {
      executeElephantsMarch(false);
    }
  };

  const executeSovereignInvadesEmpireCapital = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const defenderDominatedRegions = regions.filter(
      (r) => r.dominator === defender.id
    );

    const newRegions = regions.filter(
      (r) =>
        r.id != attacker.id &&
        r.id != defender.id &&
        !defenderDominatedRegions.includes(r)
    );

    const attackStrength = attacker.towerLevel + (activeEvent?.strength ?? 0);
    const defenseStrength = calculateEmpireStrength(defender.id, regions) ?? 0;
    const actionSuccessful = attackStrength > defenseStrength;

    if (actionSuccessful) {
      attacker.status = RegionStatus.EmpireCapital;
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;

      defenderDominatedRegions.forEach((r) => {
        r.dominator = undefined;
        r.status = RegionStatus.Sovereign;
      });
    } else {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    }

    setRegions([
      ...newRegions,
      attacker,
      defender,
      ...defenderDominatedRegions,
    ]);

    if (actionSuccessful) {
      executeElephantsMarch(true);
    } else {
      executeElephantsMarch(false);
    }
  };

  const executeEmpireInvadesSovereign = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const newRegions = regions.filter(
      (r) => r.id != attacker.id && r.id != defender.id
    );

    const attackStrength =
      (calculateEmpireStrength(attacker.id, regions) ?? 0) +
      (activeEvent?.strength ?? 0);
    const defenseStrength = defender.towerLevel;
    const actionSuccessful = attackStrength > defenseStrength;

    if (actionSuccessful) {
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;
    } else {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    }
    setRegions([...newRegions, attacker, defender]);

    if (actionSuccessful) {
      executeElephantsMarch(true);
    } else {
      executeElephantsMarch(false);
    }
  };

  const executeDominatedRebelsAgainstEmpire = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const attackStrength = attacker.towerLevel + (activeEvent?.strength ?? 0);
    const defenseStrength = defender.towerLevel;
    const actionSuccessful = attackStrength > defenseStrength;

    const newRegions = regions.filter(
      (r) => r.id != attacker.id && r.id != defender.id
    );

    if (actionSuccessful) {
      if (doesLossOfRegionCauseEmpireShatter(attacker, regions)) {
        defender.status = RegionStatus.Sovereign;
      }
      attacker.status = RegionStatus.Sovereign;
      attacker.dominator = undefined;
    } else {
      if (defender.towerLevel > 0) {
        defender.towerLevel = defender.towerLevel - 1;
      }
    }
    setRegions([...newRegions, attacker, defender]);
    executeElephantsMarch(false);
  };

  const executeSovereignInvadesCompany = (
    majorCrisisWon: boolean,
    additionalRebellions: Rebellion[]
  ) => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    if (majorCrisisWon) {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    } else {
      attacker.status = RegionStatus.EmpireCapital;
      defender.status = RegionStatus.Dominated;
      defender.controllingPresidency = undefined;
      defender.dominator = attacker.id;
      defender.towerLevel = 1;
      defender.unrest = 0;
    }

    const rebellionRegions: Region[] = [];

    for (const rebellion of additionalRebellions) {
      const region = regions.find((r) => r.id === rebellion.Region.id);

      if (!region) {
        console.error("Region not found in regions array");
        return;
      }
      if (!rebellion.RebellionSuppressed) {
        region.status = RegionStatus.Sovereign;
        region.controllingPresidency = undefined;
        region.towerLevel = 1;
      } else {
        region.unrest = 0;
      }
      rebellionRegions.push(region);
    }

    const newRegionArray = regions.filter(
      (r) =>
        !rebellionRegions.includes(r) &&
        r.id !== attacker.id &&
        r.id !== defender.id
    );

    setRegions([...newRegionArray, ...rebellionRegions, attacker, defender]);

    if (majorCrisisWon) {
      executeElephantsMarch(false);
    } else {
      executeElephantsMarch(true);
    }
  };

  const executeEmpireInvadesCompany = (
    majorCrisisWon: boolean,
    additionalRebellions: Rebellion[]
  ) => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    if (majorCrisisWon) {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    } else {
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;
      defender.controllingPresidency = undefined;
      defender.towerLevel = 1;
      defender.unrest = 0;
    }

    const rebellionRegions: Region[] = [];

    for (const rebellion of additionalRebellions) {
      const region = regions.find((r) => r.id === rebellion.Region.id);

      if (!region) {
        console.error("Region not found in regions array");
        return;
      }
      if (!rebellion.RebellionSuppressed) {
        region.status = RegionStatus.Sovereign;
        region.controllingPresidency = undefined;
        region.towerLevel = 1;
      } else {
        region.unrest = 0;
      }
      rebellionRegions.push(region);
    }

    const newRegionArray = regions.filter(
      (r) =>
        !rebellionRegions.includes(r) &&
        r.id !== attacker.id &&
        r.id !== defender.id
    );

    setRegions([...newRegionArray, ...rebellionRegions, attacker, defender]);

    if (majorCrisisWon) {
      executeElephantsMarch(false);
    } else {
      executeElephantsMarch(true);
    }
  };

  const executeCompanyControlledRebels = (
    additionalRebellions: Rebellion[]
  ) => {
    const rebellionRegions: Region[] = [];

    for (const rebellion of additionalRebellions) {
      const region = regions.find((r) => r.id === rebellion.Region.id);

      if (!region) {
        console.error("Region not found in regions array");
        return;
      }
      if (!rebellion.RebellionSuppressed) {
        region.status = RegionStatus.Sovereign;
        region.controllingPresidency = undefined;
        region.towerLevel = 1;
      } else {
        region.unrest = 0;
      }
      rebellionRegions.push(region);
    }

    const newRegionArray = regions.filter((r) => !rebellionRegions.includes(r));

    setRegions([...newRegionArray, ...rebellionRegions]);
    executeElephantsMarch(false);
  };

  const executeEmpireInvadesDominated = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const defenderDominator = regions.find((r) => r.id === defender.dominator);

    if (!defenderDominator) {
      console.error("EventDialog: Attacked of defender dominator not found!");
      return;
    }
    const newRegions = regions.filter(
      (r) =>
        r.id !== attacker.id &&
        r.id !== defender.id &&
        r.id !== defenderDominator.id
    );

    const attackStrength =
      calculateEmpireStrength(attacker.id, regions) +
      (activeEvent?.strength ?? 0);
    const defenseStrength = calculateEmpireStrength(defender.id, regions) ?? 0;
    const actionSuccessful = attackStrength > defenseStrength;

    if (actionSuccessful) {
      if (doesLossOfRegionCauseEmpireShatter(defender, regions)) {
        defenderDominator.status = RegionStatus.Sovereign;
      }
      attacker.status = RegionStatus.EmpireCapital;
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;
    } else {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    }
    setRegions([...newRegions, attacker, defender, defenderDominator]);

    if (actionSuccessful) {
      executeElephantsMarch(true);
    } else {
      executeElephantsMarch(false);
    }
  };

  const executeEmpireCapitalInvadesEmpireCapital = () => {
    const attacker = regions.find((r) => r.id === elephant.MainRegion);
    const defender = regions.find((r) => r.id === elephant.TargetRegion);

    if (!attacker || !defender) {
      console.error("EventDialog: Attacked of defender not found!");
      return;
    }

    const defenderDominatedRegions = regions.filter(
      (r) => r.dominator === defender.id
    );

    const newRegions = regions.filter(
      (r) =>
        r.id != attacker.id &&
        r.id != defender.id &&
        !defenderDominatedRegions.includes(r)
    );

    const attackStrength =
      calculateEmpireStrength(attacker.id, regions) +
      (activeEvent?.strength ?? 0);
    const defenseStrength = calculateEmpireStrength(defender.id, regions) ?? 0;
    const actionSuccessful = attackStrength > defenseStrength;

    if (actionSuccessful) {
      defender.status = RegionStatus.Dominated;
      defender.dominator = attacker.id;
      defenderDominatedRegions.forEach((r) => {
        r.dominator = undefined;
        r.status = RegionStatus.Sovereign;
      });
    } else {
      if (attacker.towerLevel > 0) {
        attacker.towerLevel = attacker.towerLevel - 1;
      }
    }

    setRegions([
      ...newRegions,
      attacker,
      defender,
      ...defenderDominatedRegions,
    ]);

    if (actionSuccessful) {
      executeElephantsMarch(true);
    } else {
      executeElephantsMarch(false);
    }
  };

  const renderEventDialog = () => {
    if (!activeEvent) {
      return;
    }

    switch (activeEvent.type) {
      case EventType.Shuffle:
        return <ShuffleEvent />;
      case EventType.Windfall:
        return <WindfallEvent />;
      case EventType.Turmoil:
        return <TurmoilEvent />;
      case EventType.Leader:
        return <LeaderEvent />;
      case EventType.Peace:
        return <PeaceEvent />;
      case EventType.ResolveCrisis:
        return (
          <CrisisEvent
            regions={regions}
            elephant={elephant}
            event={activeEvent}
            onOk={executeCrisisEvent}
          />
        );
      case EventType.ForeignInvasion:
        return (
          <ForeignInvasionEvent
            onOk={() => {}}
            elephant={elephant}
            regions={regions}
            drawStackRegion={drawStackRegion}
            setRegions={setRegions}
            setElephant={setElephant}
          />
        );

      default:
        return;
    }
  };

  const addUnrestToAllCompanyControlledRegions = () => {
    console.log("Adding 1 unrest to every Company controlled region");
    const newRegions = [...regions];

    for (const region of newRegions) {
      if (region.status === RegionStatus.CompanyControlled) {
        region.unrest++;
      }
    }
    setRegions(newRegions);
  };

  const punjab = regions.find((r) => r.id === RegionName.Punjab) ?? regions[0];
  const delhi = regions.find((r) => r.id === RegionName.Delhi) ?? regions[0];
  const bengal = regions.find((r) => r.id === RegionName.Bengal) ?? regions[0];
  const bombay = regions.find((r) => r.id === RegionName.Bombay) ?? regions[0];
  const madras = regions.find((r) => r.id === RegionName.Madras) ?? regions[0];
  const mysore = regions.find((r) => r.id === RegionName.Mysore) ?? regions[0];
  const maratha =
    regions.find((r) => r.id === RegionName.Maratha) ?? regions[0];
  const hyderabad =
    regions.find((r) => r.id === RegionName.Hyderabad) ?? regions[0];

  return (
    <Container sx={{ bgcolor: "beige" }}>
      <Box display={"flex"} sx={{ m: 1 }}>
        <Box>
          <RegionCard
            region={punjab}
            handleDeployButtonClick={() => setDeployRegion(punjab)}
          />

          <RegionCard
            region={delhi}
            handleDeployButtonClick={() => setDeployRegion(delhi)}
          />

          <RegionCard
            region={bengal}
            handleDeployButtonClick={() => setDeployRegion(bengal)}
          />
        </Box>
        <Box>
          <RegionCard
            region={bombay}
            handleDeployButtonClick={() => setDeployRegion(bombay)}
          />

          <RegionCard
            region={hyderabad}
            handleDeployButtonClick={() => setDeployRegion(hyderabad)}
          />
        </Box>

        <Box>
          <RegionCard
            region={maratha}
            handleDeployButtonClick={() => setDeployRegion(maratha)}
          />

          <RegionCard
            region={mysore}
            handleDeployButtonClick={() => setDeployRegion(mysore)}
          />

          <RegionCard
            region={madras}
            handleDeployButtonClick={() => setDeployRegion(madras)}
          />
        </Box>
      </Box>
      <>
        <EventStack />

        <ElephantCard />

        <Card>
          <CardContent>
            <Box
              display={"flex"}
              justifyContent={"space-evenly"}
              alignItems={"center"}
            >
              <Typography>
                Regions Lost : {globalEffectsContext.globalEffects.RegionsLost}
              </Typography>
              <Button onClick={() => setShowGlobalEffectsDialog(true)}>
                Adjust Laws & Global Effects
              </Button>

              <Button onClick={addUnrestToAllCompanyControlledRegions}>
                Add 1 unrest to every Company controlled regions
              </Button>
              <Button onClick={() => setShowIndiaEventsDialog(true)}>
                Handle Events In India
              </Button>
            </Box>
          </CardContent>
        </Card>
      </>

      {deployRegion && (
        <DeployDialog
          onConfirm={handleDeployDialogOk}
          targetRegion={deployRegion}
        />
      )}
      {activeEvent && renderEventDialog()}
      {showGlobalEffectsDialog && (
        <GlobalEffectsDialog
          onClose={() => setShowGlobalEffectsDialog(false)}
        />
      )}
      {showIndiaEventsDialog && (
        <EventsInIndiaDialog onOk={() => setShowIndiaEventsDialog(false)} />
      )}
    </Container>
  );
};
