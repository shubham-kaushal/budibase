import { walkProps } from "./storeUtils"
import { get_capitalised_name } from "../helpers"
import { get } from "svelte/store"
import { allScreens } from "builderStore"

export default function(component, state) {
  const capitalised = get_capitalised_name(
    component.name || component._component
  )

  const matchingComponents = []

  const findMatches = props => {
    walkProps(props, c => {
      const thisInstanceName = get_capitalised_name(c._instanceName)
      if ((thisInstanceName || "").startsWith(capitalised)) {
        matchingComponents.push(thisInstanceName)
      }
    })
  }

  // check page first
  findMatches(state.pages[state.currentPageName].props)

  // if viewing screen, check current screen for duplicate
  if (state.currentFrontEndType === "screen") {
    findMatches(state.currentPreviewItem.props)
  } else {
    // viewing master page - need to find against all screens
    for (let screen of get(allScreens)) {
      findMatches(screen.props)
    }
  }

  let index = 1
  let name
  while (!name) {
    const tryName = `${capitalised || "Copy"} ${index}`
    if (!matchingComponents.includes(tryName)) name = tryName
    index++
  }

  return name
}
